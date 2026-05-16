'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import MovieCard from '../movie/MovieCard';
import MoviesFilters from './Filters';
import Pagination from './Pagination';
import Loader from '../common/Loader';

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

  // ✅ NEW popular APIs
  getPopularMovies,
  getPopularMoviesAdmin,
  setPopularMovies,
  reorderPopularMovies,
} from '../../lib/client/moviesAdmin';
import { getDedicatedListingPath } from '../../lib/discoveryPages';

const POPULAR_PAGE_LIMIT = 30;

const toNum = (v, fallback = 1) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const asId = (value) => String(value || '').trim();

const normalizeTypeParam = (value = '') => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (key === 'movie' || key === 'movies') return 'Movie';

  if (
    key === 'webseries' ||
    key === 'webseries' ||
    key === 'tvshow' ||
    key === 'tvshows' ||
    key === 'series'
  ) {
    return 'WebSeries';
  }

  return '';
};

const moveIdsBefore = (list = [], movingIds = [], targetId = '') => {
  const target = asId(targetId);
  const movingSet = new Set((movingIds || []).map(asId).filter(Boolean));

  if (!target || movingSet.has(target)) return list;

  const moving = [];
  const rest = [];

  for (const item of list || []) {
    const id = asId(item?._id);
    if (movingSet.has(id)) moving.push(item);
    else rest.push(item);
  }

  if (!moving.length) return list;

  const targetIndex = rest.findIndex((item) => asId(item?._id) === target);
  if (targetIndex < 0) return list;

  return [
    ...rest.slice(0, targetIndex),
    ...moving,
    ...rest.slice(targetIndex),
  ];
};

const mergeUniqueMovies = (prev = [], next = []) => {
  const map = new Map();

  [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])].forEach(
    (movie) => {
      const id = asId(movie?._id);
      if (!id) return;
      map.set(id, movie);
    }
  );

  return Array.from(map.values());
};

function RecentPopularTabs({ activeTab, onChange }) {
  const activeClass =
    'bg-customPurple hover:bg-transparent border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions';

  const inactiveClass =
    'bg-dry hover:bg-customPurple border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions motion-safe:animate-pulse';

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange('recent')}
        className={activeTab === 'recent' ? activeClass : inactiveClass}
      >
        Recent
      </button>

      <button
        type="button"
        onClick={() => onChange('popular')}
        className={activeTab === 'popular' ? activeClass : inactiveClass}
      >
        Popular
      </button>
    </div>
  );
}

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

  const [movies, setMovies] = useState(() =>
    Array.isArray(initialData?.movies) ? initialData.movies : []
  );
  const [page, setPage] = useState(() => toNum(initialData?.page, 1));
  const [pages, setPages] = useState(() => toNum(initialData?.pages, 1));

  const [activeTypeTab, setActiveTypeTab] = useState('recent');

  const [popularMovies, setPopularMoviesState] = useState([]);
  const [popularPage, setPopularPage] = useState(1);
  const [popularPages, setPopularPages] = useState(1);
  const [popularTotalMovies, setPopularTotalMovies] = useState(0);
  const [popularLoaded, setPopularLoaded] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularLoadingMore, setPopularLoadingMore] = useState(false);

  const [adminMode, setAdminMode] = useState(false);
  const [localOrder, setLocalOrder] = useState([]);
  const [pendingReorder, setPendingReorder] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const [selectionPainting, setSelectionPainting] = useState(false);
  const selectionStateRef = useRef({
    active: false,
    mode: 'select',
    lastId: '',
  });
  const selectedIdsRef = useRef([]);

  const dragStateRef = useRef({
    active: false,
    draggedId: '',
    movingIds: [],
    lastOverId: '',
  });
  const [activeDragId, setActiveDragId] = useState('');

  const queryKey = useMemo(() => JSON.stringify(initialQuery || {}), [initialQuery]);

  const currentType = useMemo(
    () => normalizeTypeParam(initialQuery?.type),
    [initialQuery?.type]
  );

  const showTypeTabs = useMemo(() => {
    if (!currentType) return false;

    // Show Recent / Popular only on clean type pages:
    // /movies/type/movie
    // /movies/type/web-series
    // and their paginated variants.
    const extraFilters = [
      initialQuery?.category,
      initialQuery?.browseBy,
      initialQuery?.language,
      initialQuery?.year,
      initialQuery?.time,
      initialQuery?.rate,
      initialQuery?.search,
    ].some((value) => String(value || '').trim());

    return !extraFilters;
  }, [
    currentType,
    initialQuery?.category,
    initialQuery?.browseBy,
    initialQuery?.language,
    initialQuery?.year,
    initialQuery?.time,
    initialQuery?.rate,
    initialQuery?.search,
  ]);

  const baseDisplayMovies = useMemo(() => {
    if (showTypeTabs && activeTypeTab === 'popular') return popularMovies;
    return movies;
  }, [showTypeTabs, activeTypeTab, popularMovies, movies]);

  const baseDisplayMoviesRef = useRef(baseDisplayMovies);

  useEffect(() => {
    baseDisplayMoviesRef.current = baseDisplayMovies;
  }, [baseDisplayMovies]);

  const displayMovies =
    isAdmin && adminMode && localOrder.length ? localOrder : baseDisplayMovies;

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    setUserInfo(getUserInfo());
    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    setMovies(Array.isArray(initialData?.movies) ? initialData.movies : []);
    setPage(toNum(initialData?.page, 1));
    setPages(toNum(initialData?.pages, 1));

    setAdminMode(false);
    setLocalOrder([]);
    setPendingReorder(false);
    setSaving(false);
    setSelectedIds([]);
    setSelectionPainting(false);
    setActiveDragId('');
    selectionStateRef.current = { active: false, mode: 'select', lastId: '' };
    dragStateRef.current = {
      active: false,
      draggedId: '',
      movingIds: [],
      lastOverId: '',
    };
  }, [initialData]);

  useEffect(() => {
    setActiveTypeTab('recent');
    setPopularMoviesState([]);
    setPopularPage(1);
    setPopularPages(1);
    setPopularTotalMovies(0);
    setPopularLoaded(false);
    setPopularLoading(false);
    setPopularLoadingMore(false);
  }, [queryKey, currentType]);

  useEffect(() => {
    setPopularMoviesState([]);
    setPopularPage(1);
    setPopularPages(1);
    setPopularTotalMovies(0);
    setPopularLoaded(false);
  }, [isAdmin, token]);

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

  const loadPopularPage = useCallback(
    async ({ pageNumber = 1, append = false } = {}) => {
      if (!showTypeTabs || !currentType) return;

      try {
        if (append) setPopularLoadingMore(true);
        else setPopularLoading(true);

        const query = {
          type: currentType,
          pageNumber,
          limit: POPULAR_PAGE_LIMIT,
        };

        const data =
          isAdmin && token
            ? await getPopularMoviesAdmin(token, query)
            : await getPopularMovies(query);

        const list = Array.isArray(data?.movies) ? data.movies : [];

        setPopularMoviesState((prev) =>
          append ? mergeUniqueMovies(prev, list) : list
        );

        setPopularPage(toNum(data?.page, pageNumber));
        setPopularPages(toNum(data?.pages, 1));
        setPopularTotalMovies(Number(data?.totalMovies || 0));
        setPopularLoaded(true);
      } catch (e) {
        toast.error(e?.message || 'Failed to load popular titles');
      } finally {
        if (append) setPopularLoadingMore(false);
        else setPopularLoading(false);
      }
    },
    [showTypeTabs, currentType, isAdmin, token]
  );

  useEffect(() => {
    if (!showTypeTabs) return;
    if (activeTypeTab !== 'popular') return;
    if (popularLoaded || popularLoading) return;

    loadPopularPage({ pageNumber: 1, append: false });
  }, [
    showTypeTabs,
    activeTypeTab,
    popularLoaded,
    popularLoading,
    loadPopularPage,
  ]);

  useEffect(() => {
    if (isAdmin && adminMode) {
      setLocalOrder([...(Array.isArray(baseDisplayMovies) ? baseDisplayMovies : [])]);
      setPendingReorder(false);
      setSelectionPainting(false);
      setActiveDragId('');
    } else {
      setLocalOrder([]);
      setPendingReorder(false);
      setSelectedIds([]);
      setSelectionPainting(false);
      setActiveDragId('');
      selectionStateRef.current = { active: false, mode: 'select', lastId: '' };
      dragStateRef.current = {
        active: false,
        draggedId: '',
        movingIds: [],
        lastOverId: '',
      };
    }
  }, [isAdmin, adminMode, activeTypeTab, baseDisplayMovies]);

  const buildQueryUrl = useCallback((nextQuery = {}) => {
    const q = { ...nextQuery };
    const params = new URLSearchParams();

    const set = (k, v) => {
      const val = String(v ?? '').trim();
      if (!val) return;
      params.set(k, val);
    };

    set('type', q.type);
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
  }, []);

  const onPageChange = (p) => {
    const nextQuery = {
      ...initialQuery,
      pageNumber: p,
    };

    const dedicatedPath = getDedicatedListingPath(nextQuery);
    router.push(dedicatedPath || buildQueryUrl(nextQuery));

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTypeTab(tab);

    setAdminMode(false);
    setLocalOrder([]);
    setPendingReorder(false);
    setSelectedIds([]);
    setSelectionPainting(false);
    setActiveDragId('');

    if (tab === 'popular' && !popularLoaded && !popularLoading) {
      loadPopularPage({ pageNumber: 1, append: false });
    }
  };

  const addSelection = useCallback((id) => {
    const safe = asId(id);
    if (!safe) return;

    setSelectedIds((prev) => {
      if (prev.includes(safe)) return prev;
      return [...prev, safe];
    });
  }, []);

  const removeSelection = useCallback((id) => {
    const safe = asId(id);
    if (!safe) return;

    setSelectedIds((prev) => prev.filter((item) => item !== safe));
  }, []);

  const toggleSelect = useCallback((id) => {
    const safe = asId(id);
    if (!safe) return;

    setSelectedIds((prev) =>
      prev.includes(safe)
        ? prev.filter((item) => item !== safe)
        : [...prev, safe]
    );
  }, []);

  const clearSelection = () => setSelectedIds([]);

  const bulkOrSingle = (baseId) =>
    selectedIds.length ? selectedIds : [baseId].filter(Boolean);

  const startPaintSelection = useCallback(
    (e, id) => {
      if (!isAdmin || !adminMode) return;
      if (e.button !== 0) return;

      const safe = asId(id);
      if (!safe) return;

      const ctrlLike = !!(e.ctrlKey || e.metaKey);
      const selected = selectedIdsRef.current.includes(safe);

      let mode = 'select';

      if (ctrlLike && selected) mode = 'deselect';
      else mode = 'select';

      selectionStateRef.current = {
        active: true,
        mode,
        lastId: safe,
      };

      setSelectionPainting(true);

      if (mode === 'deselect') {
        removeSelection(safe);
      } else if (ctrlLike) {
        addSelection(safe);
      } else {
        setSelectedIds([safe]);
      }
    },
    [adminMode, isAdmin, addSelection, removeSelection]
  );

  const paintSelectionOver = useCallback(
    (_e, id) => {
      const safe = asId(id);
      const state = selectionStateRef.current;

      if (!state.active || !safe) return;
      if (state.lastId === safe) return;

      state.lastId = safe;

      if (state.mode === 'deselect') removeSelection(safe);
      else addSelection(safe);
    },
    [addSelection, removeSelection]
  );

  useEffect(() => {
    const stopPaint = () => {
      if (!selectionStateRef.current.active) return;

      selectionStateRef.current = {
        active: false,
        mode: 'select',
        lastId: '',
      };

      setSelectionPainting(false);
    };

    window.addEventListener('pointerup', stopPaint);
    window.addEventListener('pointercancel', stopPaint);
    window.addEventListener('blur', stopPaint);

    return () => {
      window.removeEventListener('pointerup', stopPaint);
      window.removeEventListener('pointercancel', stopPaint);
      window.removeEventListener('blur', stopPaint);
    };
  }, []);

  const startPointerReorder = useCallback(
    (e, id) => {
      if (!isAdmin || !adminMode) return;
      if (e.button !== 0) return;

      const safe = asId(id);
      if (!safe) return;

      const selected = selectedIdsRef.current;
      const movingIds =
        selected.includes(safe) && selected.length > 1 ? selected : [safe];

      dragStateRef.current = {
        active: true,
        draggedId: safe,
        movingIds,
        lastOverId: '',
      };

      if (!localOrder.length) {
        setLocalOrder([...(baseDisplayMoviesRef.current || [])]);
      }

      setActiveDragId(safe);

      try {
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      } catch {
        // ignore
      }
    },
    [adminMode, isAdmin, localOrder.length]
  );

  useEffect(() => {
    const onPointerMove = (e) => {
      const state = dragStateRef.current;
      if (!state.active) return;

      e.preventDefault();

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const card = element?.closest?.('[data-movie-card-id]');
      const overId = asId(card?.getAttribute?.('data-movie-card-id'));

      if (!overId) return;
      if (overId === state.lastOverId) return;
      if (state.movingIds.map(asId).includes(overId)) return;

      state.lastOverId = overId;

      setLocalOrder((prev) => {
        const source = prev.length ? prev : baseDisplayMoviesRef.current || [];
        const next = moveIdsBefore(source, state.movingIds, overId);
        return next === source ? prev : next;
      });

      setPendingReorder(true);
    };

    const stopDrag = () => {
      const state = dragStateRef.current;
      if (!state.active) return;

      dragStateRef.current = {
        active: false,
        draggedId: '',
        movingIds: [],
        lastOverId: '',
      };

      setActiveDragId('');

      try {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    window.addEventListener('blur', stopDrag);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
      window.removeEventListener('blur', stopDrag);
    };
  }, []);

  const saveOrder = async () => {
    if (!isAdmin || !token) return;

    try {
      setSaving(true);

      if (showTypeTabs && activeTypeTab === 'popular') {
        await reorderPopularMovies(
          token,
          localOrder.map((m) => m._id),
          currentType
        );

        setPopularMoviesState(localOrder);
        setPendingReorder(false);
        toast.success('Popular order saved');
        return;
      }

      await reorderMoviesInPage(
        token,
        page,
        localOrder.map((m) => m._id),
        initialQuery
      );

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

  const addToPopular = async (baseId) => {
    if (!isAdmin || !token) return;

    try {
      await setPopularMovies(token, bulkOrSingle(baseId), true);

      toast.success('Added to Popular');

      clearSelection();

      // Reset Popular tab cache so newly added title appears immediately.
      setPopularMoviesState([]);
      setPopularPage(1);
      setPopularPages(1);
      setPopularTotalMovies(0);
      setPopularLoaded(false);

      if (activeTypeTab === 'popular') {
        await loadPopularPage({ pageNumber: 1, append: false });
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to add to Popular');
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

  const loadMorePopular = () => {
    if (popularLoadingMore) return;
    if (popularPage >= popularPages) return;

    loadPopularPage({
      pageNumber: popularPage + 1,
      append: true,
    });
  };

  const showAds = displayMovies.length > 0;

  const totalLine =
    showTypeTabs && activeTypeTab === 'popular' ? (
      <>
        Total{' '}
        <span className="font-bold text-customPurple">
          {popularTotalMovies}
        </span>{' '}
        Popular Items
      </>
    ) : (
      <>
        Total{' '}
        <span className="font-bold text-customPurple">
          {displayMovies ? displayMovies.length : 0}
        </span>{' '}
        Items Found On This Page
      </>
    );

  const showPopularEmpty =
    showTypeTabs &&
    activeTypeTab === 'popular' &&
    !popularLoading &&
    !displayMovies.length;

  return (
    <section className="container py-6">
      <MoviesFilters
        categories={categories}
        browseByDistinct={browseByDistinct}
        query={initialQuery}
      />

      {showTypeTabs ? (
        <RecentPopularTabs activeTab={activeTypeTab} onChange={handleTabChange} />
      ) : null}

      {isAdmin ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAdminMode((p) => !p);
              clearSelection();
              setPendingReorder(false);
              setActiveDragId('');
              setSelectionPainting(false);
            }}
            className={`px-4 py-2 text-sm rounded border transitions ${adminMode
                ? 'bg-customPurple border-customPurple text-white'
                : 'border-customPurple text-white hover:bg-customPurple'
              }`}
          >
            {adminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
          </button>

          {adminMode ? (
            <p className="text-xs text-dryGray">
              Tip: click/drag over cards to select multiple. Use the drag icon to reorder.
              {showTypeTabs && activeTypeTab === 'recent'
                ? ' Use card dropdown → Popular to add titles to Popular.'
                : ''}
            </p>
          ) : null}

          {adminMode && selectedIds.length > 0 ? (
            <div className="text-sm text-white">
              <span className="font-semibold">{selectedIds.length}</span>{' '}
              selected
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 underline text-customPurple hover:text-white transitions"
              >
                Clear Selection
              </button>
            </div>
          ) : null}

          {adminMode && pendingReorder ? (
            <button
              type="button"
              onClick={saveOrder}
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-customPurple text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="text-md font-medium my-4 mobile:px-4">{totalLine}</p>

      {showTypeTabs && activeTypeTab === 'popular' && popularLoading && !displayMovies.length ? (
        <Loader />
      ) : displayMovies.length ? (
        <>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-5 gap-4">
            {displayMovies.map((m) => {
              const id = asId(m?._id);
              const draggingSelectedGroup =
                !!activeDragId &&
                selectedIds.includes(id) &&
                selectedIds.includes(activeDragId);

              return (
                <MovieCard
                  key={m._id}
                  movie={m}
                  showAdminControls={isAdmin && adminMode}
                  isSelected={selectedIds.includes(m._id)}
                  onSelectToggle={toggleSelect}
                  totalPages={
                    showTypeTabs && activeTypeTab === 'popular'
                      ? undefined
                      : pages
                  }
                  onMoveToPageClick={
                    showTypeTabs && activeTypeTab === 'popular'
                      ? undefined
                      : (movieId, p) => moveToAnyPage(movieId, p)
                  }
                  onMoveToLatestNewClick={(movieId) => addToTrending(movieId)}
                  onMoveToBannerClick={(movieId) => addToBanner(movieId)}
                  onMoveToPopularClick={
                    showTypeTabs && activeTypeTab === 'recent'
                      ? (movieId) => addToPopular(movieId)
                      : undefined
                  }
                  adminDraggable={isAdmin && adminMode}
                  onAdminCardPointerDown={startPaintSelection}
                  onAdminCardPointerEnter={paintSelectionOver}
                  onAdminDragHandlePointerDown={startPointerReorder}
                  adminSelectionPaintActive={selectionPainting}
                  isAdminDragging={activeDragId === id || draggingSelectedGroup}
                />
              );
            })}
          </div>

          {showTypeTabs && activeTypeTab === 'popular' ? (
            popularPage < popularPages ? (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  onClick={loadMorePopular}
                  disabled={popularLoadingMore}
                  className="bg-customPurple hover:bg-transparent border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions disabled:opacity-60"
                >
                  {popularLoadingMore ? 'Loading...' : 'Show More'}
                </button>
              </div>
            ) : null
          ) : pages > 1 ? (
            <div className="mt-10 flex justify-center">
              <Pagination page={page} pages={pages} onChange={onPageChange} />
            </div>
          ) : null}

          {showAds ? (
            <div className="mt-8 space-y-6">
              <EffectiveGateNativeBanner
                refreshKey={
                  showTypeTabs && activeTypeTab === 'popular'
                    ? `movies-popular-${currentType}-${popularPage}`
                    : `movies-${page}`
                }
              />
              <EffectiveGateSquareAd
                refreshKey={
                  showTypeTabs && activeTypeTab === 'popular'
                    ? `movies-popular-square-${currentType}-${popularPage}`
                    : `movies-square-${page}`
                }
              />
            </div>
          ) : null}
        </>
      ) : showPopularEmpty ? (
        <div className="mt-10 bg-dry border border-border rounded-lg p-6 text-center">
          <h3 className="text-white font-semibold text-lg">
            No Popular titles yet
          </h3>

          <p className="text-dryGray text-sm mt-2">
            Admin can open the Recent tab, enter Admin Mode, and use each movie card
            dropdown to add titles to Popular.
          </p>
        </div>
      ) : (
        <div className="mt-10 text-center text-gray-300">No movies found.</div>
      )}
    </section>
  );
}
