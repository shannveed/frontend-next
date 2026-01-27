'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import MovieCard from '../movie/MovieCard';
import MoviesFilters from './Filters';
import Pagination from './Pagination';

import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

import { getUserInfo } from '../../lib/client/auth';
import {
  getMoviesAdmin,
  moveMoviesToPage,
  reorderMoviesInPage,
  setBannerMovies,
  setLatestNewMovies,
} from '../../lib/client/moviesAdmin';

const toNum = (v, fallback = 1) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export default function MoviesClient({
  initialQuery = {},
  initialData = {},
  categories = [],
  browseByDistinct = [],
}) {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  // visible data
  const [movies, setMovies] = useState(() =>
    Array.isArray(initialData?.movies) ? initialData.movies : []
  );
  const [page, setPage] = useState(() => toNum(initialData?.page, 1));
  const [pages, setPages] = useState(() => toNum(initialData?.pages, 1));

  // admin mode
  const [adminMode, setAdminMode] = useState(false);
  const [localOrder, setLocalOrder] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [pendingReorder, setPendingReorder] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  // update userInfo from localStorage
  useEffect(() => {
    setUserInfo(getUserInfo());
    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // when server props change (navigation)
  useEffect(() => {
    setMovies(Array.isArray(initialData?.movies) ? initialData.movies : []);
    setPage(toNum(initialData?.page, 1));
    setPages(toNum(initialData?.pages, 1));

    // keep your old behavior
    setAdminMode(false);
    setLocalOrder([]);
    setPendingReorder(false);
    setDraggedId(null);
    setSelectedIds([]);
  }, [initialData]);

  // admin sees drafts too (client-side replace list)
  const queryKey = useMemo(() => JSON.stringify(initialQuery || {}), [initialQuery]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getMoviesAdmin(token, initialQuery);
        if (cancelled) return;

        setMovies(Array.isArray(data?.movies) ? data.movies : []);
        setPage(toNum(data?.page, 1));
        setPages(toNum(data?.pages, 1));
      } catch {
        // keep public list on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // admin reorder list sync
  useEffect(() => {
    if (isAdmin && adminMode) {
      setLocalOrder([...movies]);
      setPendingReorder(false);
    } else {
      setLocalOrder([]);
      setPendingReorder(false);
      setDraggedId(null);
    }
  }, [isAdmin, adminMode, movies]);

  const displayMovies =
    isAdmin && adminMode && localOrder.length ? localOrder : movies;

  // Build URL without useSearchParams (SSR/ISR safe)
  const buildUrl = useCallback(
    (overrides = {}) => {
      const q = { ...initialQuery, ...overrides };

      const params = new URLSearchParams();
      const set = (k, v) => {
        const val = String(v ?? '').trim();
        if (!val) return;
        params.set(k, val);
      };

      set('category', q.category);
      set('browseBy', q.browseBy);
      set('language', q.language);
      set('year', q.year);
      set('time', q.time);
      set('rate', q.rate);
      set('search', q.search);

      const pn = toNum(q.pageNumber ?? 1, 1);
      if (pn > 1) params.set('pageNumber', String(pn));

      const qs = params.toString();
      return qs ? `/movies?${qs}` : '/movies';
    },
    [initialQuery]
  );

  const onPageChange = (p) => {
    router.push(buildUrl({ pageNumber: p }));
    window.scrollTo(0, 0);
  };

  // selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);
  const bulkOrSingle = (baseId) => (selectedIds.length ? selectedIds : [baseId]);

  // drag reorder
  const onAdminDragStart = (e, id) => {
    try {
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
    setDraggedId(id);
  };

  const onAdminDragEnter = (_e, targetId) => {
    if (!draggedId || draggedId === targetId) return;

    setLocalOrder((prev) => {
      const from = prev.findIndex((m) => m._id === draggedId);
      const to = prev.findIndex((m) => m._id === targetId);
      if (from < 0 || to < 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    setPendingReorder(true);
  };

  const onAdminDragEnd = () => setDraggedId(null);

  const saveOrder = async () => {
    if (!isAdmin || !token) return;
    try {
      setSaving(true);
      await reorderMoviesInPage(token, page, localOrder.map((m) => m._id));
      toast.success('Order saved for this page');
      setPendingReorder(false);
      router.refresh();
    } catch (e) {
      toast.error(e?.message || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const addToTrending = async (baseId) => {
    if (!isAdmin || !token) return;
    try {
      await setLatestNewMovies(token, bulkOrSingle(baseId), true);
      toast.success('Added to Latest New');
      clearSelection();
    } catch (e) {
      toast.error(e?.message || 'Failed');
    }
  };

  const addToBanner = async (baseId) => {
    if (!isAdmin || !token) return;
    try {
      await setBannerMovies(token, bulkOrSingle(baseId), true);
      toast.success('Added to Banner');
      clearSelection();
    } catch (e) {
      toast.error(e?.message || 'Failed');
    }
  };

  const moveToAnyPage = async (baseId, targetPage) => {
    if (!isAdmin || !token) return;
    const tp = toNum(targetPage, 1);

    try {
      await moveMoviesToPage(token, tp, bulkOrSingle(baseId));
      toast.success(`Moved to page ${tp}`);
      clearSelection();
      router.refresh();
    } catch (e) {
      toast.error(e?.message || 'Failed');
    }
  };

  const showAds = displayMovies.length > 0;

  return (
    <section className="container py-6">
      {/* Filters */}
      <MoviesFilters
        categories={categories}
        browseByDistinct={browseByDistinct}
        query={initialQuery}
      />

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAdminMode((p) => !p);
              clearSelection();
              setPendingReorder(false);
              setDraggedId(null);
            }}
            className={`px-4 py-2 text-sm rounded border transitions ${
              adminMode
                ? 'bg-customPurple border-customPurple text-white'
                : 'border-customPurple text-white hover:bg-customPurple'
            }`}
          >
            {adminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
          </button>

          {adminMode && selectedIds.length > 0 && (
            <div className="text-sm text-white">
              <span className="font-semibold">{selectedIds.length}</span> selected
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 underline text-customPurple hover:text-white transitions"
              >
                Clear Selection
              </button>
            </div>
          )}

          {adminMode && pendingReorder && (
            <button
              type="button"
              onClick={saveOrder}
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-customPurple text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          )}
        </div>
      )}

      <p className="text-md font-medium my-4 mobile:px-4">
          Total{' '}
          <span className="font-bold text-customPurple">
            {displayMovies ? displayMovies.length : 0}
          </span>{' '}
          Items Found On This Page
        </p>

      {displayMovies.length ? (
        <>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-5 gap-4">
            {displayMovies.map((m) => (
              <MovieCard
                key={m._id}
                movie={m}
                showAdminControls={isAdmin && adminMode}
                isSelected={selectedIds.includes(m._id)}
                onSelectToggle={toggleSelect}
                totalPages={pages}
                onMoveToPageClick={(movieId, p) => moveToAnyPage(movieId, p)}
                onMoveToLatestNewClick={(movieId) => addToTrending(movieId)}
                onMoveToBannerClick={(movieId) => addToBanner(movieId)}
                adminDraggable={isAdmin && adminMode}
                onAdminDragStart={onAdminDragStart}
                onAdminDragEnter={onAdminDragEnter}
                onAdminDragEnd={onAdminDragEnd}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-10 flex justify-center">
              <Pagination page={page} pages={pages} onChange={onPageChange} />
            </div>
          )}

          {showAds && (
            <div className="mt-8 space-y-6">
              <EffectiveGateNativeBanner refreshKey={`movies-${page}`} />
              <EffectiveGateSquareAd refreshKey={`movies-square-${page}`} />
            </div>
          )}
        </>
      ) : (
        <div className="mt-10 text-center text-gray-300">No movies found.</div>
      )}
    </section>
  );
}
