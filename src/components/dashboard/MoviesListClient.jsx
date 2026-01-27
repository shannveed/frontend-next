'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';
import Table from './Table';

import {
  deleteAllMoviesAdmin,
  deleteMovieAdmin,
  getMoviesAdmin,
} from '../../lib/client/moviesAdmin';

function computePager(page, pages) {
  const max = Math.min(5, pages);
  const out = [];

  for (let i = 0; i < max; i++) {
    let p;
    if (pages <= 5) p = i + 1;
    else if (page <= 3) p = i + 1;
    else if (page >= pages - 2) p = pages - 4 + i;
    else p = page - 2 + i;
    out.push(p);
  }
  return out;
}

export default function MoviesListClient() {
  return (
    <RequireAdmin>{(user) => <MoviesListInner token={user.token} />}</RequireAdmin>
  );
}

function MoviesListInner({ token }) {
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [movies, setMovies] = useState([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchApplied, setSearchApplied] = useState('');

  const pager = useMemo(() => computePager(page, pages), [page, pages]);

  const load = async (p = page, s = searchApplied) => {
    try {
      setLoading(true);
      const res = await getMoviesAdmin(token, { pageNumber: p, search: s });
      setMovies(Array.isArray(res?.movies) ? res.movies : []);
      setPage(Number(res?.page || 1));
      setPages(Number(res?.pages || 1));
      setTotalMovies(Number(res?.totalMovies || 0));
    } catch (e) {
      toast.error(e?.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load(page, searchApplied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchApplied]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchApplied(searchTerm.trim());
  };

  const deleteMovieHandler = async (id) => {
    if (!window.confirm('Delete this movie?')) return;
    try {
      await deleteMovieAdmin(token, id);
      toast.success('Movie deleted');
      load(page, searchApplied);
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const deleteAllHandler = async () => {
    if (!window.confirm('Are you sure you want to delete ALL movies?')) return;
    try {
      setDeletingAll(true);
      await deleteAllMoviesAdmin(token);
      toast.success('All movies deleted');
      setPage(1);
      setSearchApplied('');
      setSearchTerm('');
      await load(1, '');
    } catch (e) {
      toast.error(e?.message || 'Delete all failed');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <SideBarShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">Movies List</h2>

        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movie name..."
            className="bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
          />
          <button
            type="submit"
            className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
          >
            Search
          </button>
        </form>

        {totalMovies > 0 && (
          <button
            onClick={deleteAllHandler}
            disabled={deletingAll}
            className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded font-semibold text-sm disabled:opacity-60"
            type="button"
          >
            {deletingAll ? 'Deleting…' : 'Delete All'}
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : movies.length ? (
        <>
          <p className="text-sm text-dryGray mb-4">
            Total: <span className="text-white font-semibold">{totalMovies}</span>
          </p>

          <Table data={movies} admin={true} onDeleteHandler={deleteMovieHandler} />

          <div className="flex items-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 rounded border border-customPurple text-white disabled:opacity-50"
            >
              Prev
            </button>

            {pager.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-3 py-2 rounded border ${
                  page === p
                    ? 'bg-customPurple border-customPurple text-white'
                    : 'border-customPurple text-white hover:bg-customPurple'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-2 rounded border border-customPurple text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-border text-sm">No movies found.</p>
      )}
    </SideBarShell>
  );
}
