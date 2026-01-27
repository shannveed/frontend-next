// frontend-next/src/components/movies/MoviesClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function MoviesClient({
  initialQuery,
  initialData,
  categories,
  browseByDistinct,
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  // visible data
  const [movies, setMovies] = useState(initialData?.movies || []);
  const [page, setPage] = useState(initialData?.page || 1);
  const [pages, setPages] = useState(initialData?.pages || 1);

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
    setMovies(initialData?.movies || []);
    setPage(initialData?.page || 1);
    setPages(initialData?.pages || 1);

    // keep your old behavior
    setAdminMode(false);
    setLocalOrder([]);
    setPendingReorder(false);
    setDraggedId(null);
    setSelectedIds([]);
  }, [initialData]);

  // admin sees drafts too (client-side replace list)
  const queryKey = useMemo(
    () => JSON.stringify(initialQuery || {}),
    [initialQuery]
  );

  useEffect(() => {
    if (!isAdmin || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getMoviesAdmin(token, initialQuery);
        if (cancelled) return;

        setMovies(data?.movies || []);
        setPage(data?.page || 1);
        setPages(data?.pages || 1);
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

  // keep existing URL builder (used by pagination)
  const buildUrl = (overrides = {}) => {
    const params = new URLSearchParams(sp.toString());

    const setOrDelete = (k, v) => {
      if (v === undefined || v === null || v === '') params.delete(k);
      else params.set(k, String(v));
    };

    setOrDelete('category', overrides.category ?? initialQuery.category);
    setOrDelete('browseBy', overrides.browseBy ?? initialQuery.browseBy);
    setOrDelete('language', overrides.language ?? initialQuery.language);
    setOrDelete('year', overrides.year ?? initialQuery.year);
    setOrDelete('time', overrides.time ?? initialQuery.time);
    setOrDelete('rate', overrides.rate ?? initialQuery.rate);
    setOrDelete('search', overrides.search ?? initialQuery.search);

    setOrDelete(
      'pageNumber',
      overrides.pageNumber ?? initialQuery.pageNumber ?? 1
    );

    const qs = params.toString();
    return qs ? `/movies?${qs}` : '/movies';
  };

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

  // drag reorder (React parity)
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

  const bulkOrSingle = (baseId) => (selectedIds.length ? selectedIds : [baseId]);

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
    const tp = Number(targetPage) || 1;

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
    <div className="min-height-screen container mx-auto px-8 mobile:px-0 my-2">
      {/* ✅ CRA-style filters UI */}
      <MoviesFilters categories={categories} browseByDistinct={browseByDistinct} />

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="my-4 p-4 bg-dry rounded-lg border border-border">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setAdminMode((p) => !p);
                clearSelection();
              }}
              className={`px-4 py-2 text-sm rounded border transitions ${
                adminMode
                  ? 'bg-customPurple border-customPurple text-white'
                  : 'border-customPurple text-white hover:bg-customPurple'
              }`}
              type="button"
            >
              {adminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
            </button>

            {adminMode && selectedIds.length > 0 && (
              <>
                <span className="text-xs text-customPurple font-semibold">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-xs rounded border border-border text-white bg-main hover:bg-dry transitions"
                >
                  Clear Selection
                </button>
              </>
            )}

            {adminMode && pendingReorder && (
              <button
                type="button"
                onClick={saveOrder}
                disabled={saving}
                className="px-4 py-2 text-sm rounded bg-green-600 hover:bg-green-700 text-white transitions disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Order'}
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-md font-medium my-4 mobile:px-2">
        Total{' '}
        <span className="font-bold text-customPurple">
          {displayMovies.length}
        </span>{' '}
        Items Found On This Page
      </p>

      {displayMovies.length ? (
        <>
          <div className="grid sm:mt-8 mt-6 xl:grid-cols-5 2xl:grid-cols-5 lg:grid-cols-3 sm:grid-cols-2 mobile:grid-cols-2 grid-cols-1 gap-4 mobile:gap-3 ">
            {displayMovies.map((m) => (
              <MovieCard
                key={m._id}
                movie={m}
                showAdminControls={isAdmin && adminMode}
                isSelected={selectedIds.includes(m._id)}
                onSelectToggle={toggleSelect}
                totalPages={pages}
                onMoveToPageClick={moveToAnyPage}
                onMoveToLatestNewClick={addToTrending}
                onMoveToBannerClick={addToBanner}
                adminDraggable={isAdmin && adminMode}
                onAdminDragStart={onAdminDragStart}
                onAdminDragEnter={onAdminDragEnter}
                onAdminDragEnd={onAdminDragEnd}
              />
            ))}
          </div>

          <Pagination page={page} pages={pages} onChange={onPageChange} />

          {showAds && (
            <>
              <EffectiveGateNativeBanner refreshKey="movies-page-bottom-desktop" />
              <EffectiveGateSquareAd
                refreshKey="movies-page-bottom-mobile"
                className="px-4 sm:px-0"
              />
            </>
          )}
        </>
      ) : (
        <div className="w-full gap-6 flex-colo min-h-screen">
          <p className="text-border text-sm">No movies found.</p>
        </div>
      )}
    </div>
  );
}
