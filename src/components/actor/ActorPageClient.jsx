// src/components/actor/ActorPageClient.jsx
'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import SafeImage from '../common/SafeImage';
import MovieCard from '../movie/MovieCard';

export default function ActorPageClient({
  slug,
  initialActor,
  initialMovies = [],
  initialPage = 1,
  initialPages = 1,
  total = 0,
}) {
  const [actor] = useState(initialActor);
  const [movies, setMovies] = useState(initialMovies);

  const [page, setPage] = useState(initialPage);
  const [pages, setPages] = useState(initialPages);

  const [loadingMore, setLoadingMore] = useState(false);

  const [filter, setFilter] = useState('all'); // all | Movie | WebSeries
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (movies || [])
      .filter((m) => {
        if (filter !== 'all' && m.type !== filter) return false;
        if (!term) return true;
        return String(m?.name || '').toLowerCase().includes(term);
      });
  }, [movies, filter, search]);

  const loadMore = async () => {
    if (loadingMore) return;
    if (page >= pages) return;

    try {
      setLoadingMore(true);
      const next = page + 1;

      const res = await fetch(`/api/actors/${encodeURIComponent(slug)}?page=${next}&limit=24`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || 'Failed to load more');

      setMovies((prev) => {
        const map = new Map((prev || []).map((m) => [m._id, m]));
        (data.movies || []).forEach((m) => map.set(m._id, m));
        return Array.from(map.values());
      });

      setPage(data.page || next);
      setPages(data.pages || pages);
    } catch (e) {
      toast.error(e?.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const roleLabel =
    Array.isArray(actor?.roles) && actor.roles.length
      ? actor.roles.map((r) => (r === 'director' ? 'Director' : 'Actor')).join(' • ')
      : 'Actor';

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="bg-dry border border-border  rounded-lg p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">

          <div className="w-[140px] aspect-[3/4] rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center">
  <SafeImage
    src={actor?.image || '/images/placeholder.jpg'}
    alt={actor?.name || 'Actor'}
    width={140}
    height={190}
    className="object-contain"
  />
</div>


          <div className="flex-1 w-full">
            <h1 className="text-xl sm:text-2xl font-semibold text-white leading-tight">
  {actor?.name}
</h1>

            <p className="text-dryGray text-sm mt-1">{roleLabel}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 rounded bg-main border border-border text-xs text-white">
                Total titles: <span className="text-customPurple font-semibold">{total}</span>
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { key: 'all', label: 'All' },
                { key: 'Movie', label: 'Movies' },
                { key: 'WebSeries', label: 'Web Series' },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setFilter(b.key)}
                  className={`px-4 py-2 rounded border text-sm transitions ${
                    filter === b.key
                      ? 'bg-customPurple border-customPurple text-white'
                      : 'bg-main border-border text-white hover:border-customPurple'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mt-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this filmography..."
                className="w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-5 gap-4">
        {filtered.map((m) => (
          <MovieCard key={m._id} movie={m} showLike />
        ))}
      </div>

      {/* Load more */}
      {page < pages && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-customPurple hover:bg-opacity-90 transition text-white px-8 py-3 rounded font-semibold disabled:opacity-60"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
