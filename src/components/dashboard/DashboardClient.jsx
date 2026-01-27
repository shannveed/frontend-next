'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaRegListAlt, FaUser } from 'react-icons/fa';
import { HiViewGridAdd } from 'react-icons/hi';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';
import Table from './Table';

import { getMoviesAdmin, deleteMovieAdmin } from '../../lib/client/moviesAdmin';
import { getCategoriesClient } from '../../lib/client/catalog';
import { getUsersAdmin } from '../../lib/client/adminUsers';

function StatCard({ icon: Icon, title, total, bg }) {
  return (
    <div className={`rounded-lg p-4 border border-border ${bg}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center">
          <Icon />
        </div>
        <div>
          <p className="text-xs text-white/80">{title}</p>
          <p className="text-lg font-bold text-white">{total}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  return (
    <RequireAdmin>
      {(user) => <DashboardInner token={user.token} />}
    </RequireAdmin>
  );
}

function DashboardInner({ token }) {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    movies: 0,
    categories: 0,
    users: 0,
  });

  const [recentMovies, setRecentMovies] = useState([]);

  const load = async () => {
    try {
      setLoading(true);

      const [moviesRes, cats, users] = await Promise.all([
        getMoviesAdmin(token, { pageNumber: 1 }),
        getCategoriesClient(),
        getUsersAdmin(token),
      ]);

      setStats({
        movies: Number(moviesRes?.totalMovies || 0),
        categories: Array.isArray(cats) ? cats.length : 0,
        users: Array.isArray(users) ? users.length : 0,
      });

      setRecentMovies(Array.isArray(moviesRes?.movies) ? moviesRes.movies.slice(0, 8) : []);
    } catch (e) {
      toast.error(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const deleteMovieHandler = async (id) => {
    if (!window.confirm('Delete this movie?')) return;
    try {
      await deleteMovieAdmin(token, id);
      toast.success('Movie deleted');
      load();
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <SideBarShell>
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard bg="bg-orange-600/30" icon={FaRegListAlt} title="Total Movies" total={stats.movies} />
            <StatCard bg="bg-blue-700/30" icon={HiViewGridAdd} title="Total Categories" total={stats.categories} />
            <StatCard bg="bg-green-600/30" icon={FaUser} title="Total Users" total={stats.users} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Movies</h3>
          </div>

          {recentMovies.length ? (
            <Table data={recentMovies} admin={true} onDeleteHandler={deleteMovieHandler} />
          ) : (
            <p className="text-border text-sm">No movies found.</p>
          )}
        </>
      )}
    </SideBarShell>
  );
}
