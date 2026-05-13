// src/components/home/HomeAdminPanelClient.jsx
'use client';

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';
import { RiMovie2Line } from 'react-icons/ri';

import { SidebarContext } from '../../context/DrawerContext';

import {
  getBannerMoviesAdmin,
  getLatestNewMoviesAdmin,
  reorderLatestNewMovies,
  setBannerMovies,
  setLatestNewMovies,
} from '../../lib/client/moviesAdmin';

import BannerSlider from './BannerSlider';
import MovieCard from '../movie/MovieCard';
import BrowseSwiperSection from './BrowseSwiperSection';
import Promos from './Promos';

import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

const ADMIN_HOME_TRENDING_FETCH_LIMIT = 30;
const ADMIN_HOME_TRENDING_DISPLAY_LIMIT = 24;
const ADMIN_HOME_LATEST_DISPLAY_LIMIT = 20;

const asId = (value) => String(value || '').trim();

const moveIdBefore = (list = [], movingId = '', targetId = '') => {
  const moving = asId(movingId);
  const target = asId(targetId);

  if (!moving || !target || moving === target) return list;

  const movingItem = list.find((item) => asId(item?._id) === moving);
  if (!movingItem) return list;

  const rest = list.filter((item) => asId(item?._id) !== moving);
  const targetIndex = rest.findIndex((item) => asId(item?._id) === target);

  if (targetIndex < 0) return list;

  return [
    ...rest.slice(0, targetIndex),
    movingItem,
    ...rest.slice(targetIndex),
  ];
};

export default function HomeAdminPanelClient({
  userInfo = null,
  initialBanner = [],
  initialLatestNew = [],
  initialLatestMovies = [],
  initialTopRated = [],
}) {
  const { activeMobileTab, activeMobileHomeTab, setActiveMobileHomeTab } =
    useContext(SidebarContext);

  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  const [activeDesktopTab, setActiveDesktopTab] = useState('latestNew');

  const [bannerMovies, setBannerMoviesState] = useState(initialBanner);
  const [latestNewMovies, setLatestNewMoviesState] = useState(initialLatestNew);

  const latestMovies = useMemo(
    () => (Array.isArray(initialLatestMovies) ? initialLatestMovies : []),
    [initialLatestMovies]
  );

  const topRated = useMemo(
    () => (Array.isArray(initialTopRated) ? initialTopRated : []),
    [initialTopRated]
  );

  const [removingBannerId, setRemovingBannerId] = useState(null);
  const [removingLatestNewId, setRemovingLatestNewId] = useState(null);

  const [editTrending, setEditTrending] = useState(false);
  const [localOrder, setLocalOrder] = useState([]);
  const [pendingReorder, setPendingReorder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeTrendingDragId, setActiveTrendingDragId] = useState('');

  const trendingDragRef = useRef({
    active: false,
    draggedId: '',
    lastOverId: '',
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('homeDesktopTab');
      if (stored) setActiveDesktopTab(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('homeDesktopTab', activeDesktopTab);
    } catch {
      // ignore
    }
  }, [activeDesktopTab]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const [b, t] = await Promise.all([
          getBannerMoviesAdmin(token, 10),
          getLatestNewMoviesAdmin(token, ADMIN_HOME_TRENDING_FETCH_LIMIT),
        ]);

        if (cancelled) return;

        setBannerMoviesState(Array.isArray(b) ? b : []);
        setLatestNewMoviesState(Array.isArray(t) ? t : []);
      } catch {
        // keep initial server/public lists
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token]);

  useEffect(() => {
    if (isAdmin && editTrending) {
      setLocalOrder([...(Array.isArray(latestNewMovies) ? latestNewMovies : [])]);
      setPendingReorder(false);
      setActiveTrendingDragId('');
    } else {
      setLocalOrder([]);
      setPendingReorder(false);
      setActiveTrendingDragId('');
      trendingDragRef.current = {
        active: false,
        draggedId: '',
        lastOverId: '',
      };
    }
  }, [isAdmin, editTrending, latestNewMovies]);

  const trendingDisplay =
    isAdmin && editTrending && localOrder.length ? localOrder : latestNewMovies;

  const bannerFeed = useMemo(() => {
    const curated = Array.isArray(bannerMovies) ? bannerMovies : [];
    if (curated.length > 0) return curated;
    return Array.isArray(latestMovies) ? latestMovies : [];
  }, [bannerMovies, latestMovies]);

  const canRemoveFromBanner =
    isAdmin && !!token && Array.isArray(bannerMovies) && bannerMovies.length > 0;

  const handleRemoveFromBanner = async (movieId) => {
    if (!isAdmin || !token) return;

    try {
      setRemovingBannerId(movieId);
      await setBannerMovies(token, [movieId], false);
      setBannerMoviesState((prev) => prev.filter((m) => m._id !== movieId));
      toast.success('Removed from Banner');
    } catch (e) {
      toast.error(e?.message || 'Failed to remove from Banner');
    } finally {
      setRemovingBannerId(null);
    }
  };

  const handleRemoveFromTrending = async (movieId) => {
    if (!isAdmin || !token) return;

    try {
      setRemovingLatestNewId(movieId);
      await setLatestNewMovies(token, [movieId], false);
      setLatestNewMoviesState((prev) => prev.filter((m) => m._id !== movieId));
      setLocalOrder((prev) => prev.filter((m) => m._id !== movieId));
      toast.success('Removed from Trending');
    } catch (e) {
      toast.error(e?.message || 'Failed to remove from Trending');
    } finally {
      setRemovingLatestNewId(null);
    }
  };

  const startTrendingPointerReorder = useCallback(
    (e, id) => {
      if (!isAdmin || !editTrending) return;
      if (e.button !== 0) return;

      const safe = asId(id);
      if (!safe) return;

      e.preventDefault();
      e.stopPropagation();

      trendingDragRef.current = {
        active: true,
        draggedId: safe,
        lastOverId: '',
      };

      if (!localOrder.length) {
        setLocalOrder([...(Array.isArray(latestNewMovies) ? latestNewMovies : [])]);
      }

      setActiveTrendingDragId(safe);

      try {
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      } catch {
        // ignore
      }
    },
    [editTrending, isAdmin, latestNewMovies, localOrder.length]
  );

  useEffect(() => {
    const onPointerMove = (e) => {
      const state = trendingDragRef.current;
      if (!state.active) return;

      e.preventDefault();

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const card = element?.closest?.('[data-trending-card-id]');
      const overId = asId(card?.getAttribute?.('data-trending-card-id'));

      if (!overId) return;
      if (overId === state.lastOverId) return;
      if (overId === state.draggedId) return;

      state.lastOverId = overId;

      setLocalOrder((prev) => {
        const source =
          prev.length && editTrending
            ? prev
            : Array.isArray(latestNewMovies)
              ? latestNewMovies
              : [];

        const next = moveIdBefore(source, state.draggedId, overId);
        return next === source ? prev : next;
      });

      setPendingReorder(true);
    };

    const stopDrag = () => {
      const state = trendingDragRef.current;
      if (!state.active) return;

      trendingDragRef.current = {
        active: false,
        draggedId: '',
        lastOverId: '',
      };

      setActiveTrendingDragId('');

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
  }, [editTrending, latestNewMovies]);

  const saveTrendingOrder = async () => {
    if (!isAdmin || !token) return;
    if (!localOrder.length) return;

    try {
      setSavingOrder(true);

      await reorderLatestNewMovies(
        token,
        localOrder.map((m) => m._id)
      );

      toast.success('Trending order saved');
      setPendingReorder(false);

      const t = await getLatestNewMoviesAdmin(token, 100);
      setLatestNewMoviesState(Array.isArray(t) ? t : []);
    } catch (e) {
      toast.error(e?.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const DesktopTabs = () => (
    <div className="hidden sm:flex items-center gap-4 my-6 border-b border-border pb-4">
      {[
        { key: 'latestNew', label: 'Trending' },
        { key: 'latest', label: 'New Releases' },
        { key: 'browseBy', label: 'BrowseBy Film Industry' },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => setActiveDesktopTab(t.key)}
          className={`px-6 py-2.5 rounded-md font-semibold text-sm transitions ${activeDesktopTab === t.key
              ? 'bg-customPurple text-white'
              : 'bg-dry text-white hover:bg-customPurple/20 border border-border'
            }`}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const TrendingGrid = ({ mobile = false }) => {
    if (!trendingDisplay.length) {
      return (
        <div className="w-full gap-6 flex-colo py-12">
          <div className="flex-colo w-24 h-24 p-5 mb-4 rounded-full bg-dry text-customPurple text-4xl">
            <RiMovie2Line />
          </div>
          <p className="text-border text-sm">No Trending titles yet.</p>
        </div>
      );
    }

    return (
      <>
        {isAdmin ? (
          <div className="my-4 p-4 bg-dry rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setEditTrending((p) => !p)}
                className={`px-4 py-2 text-sm rounded border transitions ${editTrending
                    ? 'bg-customPurple border-customPurple text-white'
                    : 'border-customPurple text-white hover:bg-customPurple'
                  }`}
              >
                {editTrending ? 'Exit Edit Trending' : 'Edit Trending Order'}
              </button>

              {editTrending ? (
                <p className="text-xs text-dryGray">
                  Drag any card to reorder. This uses a faster custom pointer drag.
                </p>
              ) : null}

              {editTrending && pendingReorder ? (
                <button
                  type="button"
                  onClick={saveTrendingOrder}
                  disabled={savingOrder}
                  className="px-4 py-2 text-sm rounded bg-green-600 hover:bg-green-700 text-white transitions disabled:opacity-60"
                >
                  {savingOrder ? 'Saving...' : 'Save Order'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`grid ${mobile
              ? 'grid-cols-2 gap-2'
              : 'xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 gap-4'
            }`}
        >
          {trendingDisplay
            .slice(0, ADMIN_HOME_TRENDING_DISPLAY_LIMIT)
            .map((m) => {
              const dragging = activeTrendingDragId === String(m?._id || '');

              return (
                <div
                  key={m._id}
                  data-trending-card-id={m._id}
                  className={`relative select-none ${editTrending
                      ? 'cursor-grab active:cursor-grabbing touch-none'
                      : ''
                    } ${dragging ? 'opacity-70 scale-[0.98]' : ''}`}
                  onPointerDownCapture={
                    editTrending
                      ? (e) => startTrendingPointerReorder(e, m._id)
                      : undefined
                  }
                >
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveFromTrending(m._id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={removingLatestNewId === m._id}
                      className="absolute top-2 right-2 z-30 w-9 h-9 flex-colo rounded-full bg-red-600/85 hover:bg-red-600 text-white disabled:opacity-60"
                    >
                      {removingLatestNewId === m._id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IoClose className="text-xl" />
                      )}
                    </button>
                  ) : null}

                  {editTrending ? (
                    <div className="absolute top-2 left-2 z-30 rounded bg-main/90 border border-border px-2 py-1 text-[10px] text-white">
                      Drag
                    </div>
                  ) : null}

                  <MovieCard movie={m} />
                </div>
              );
            })}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            href="/movies"
            className="bg-customPurple hover:bg-transparent border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions"
          >
            Show More
          </Link>
        </div>

        {mobile ? (
          <EffectiveGateSquareAd
            refreshKey="home-mobile-trending"
            className="px-0"
          />
        ) : (
          <EffectiveGateNativeBanner refreshKey="home-desktop-trending" />
        )}
      </>
    );
  };

  const LatestGrid = ({ mobile = false }) => {
    const list = Array.isArray(latestMovies)
      ? latestMovies.slice(0, ADMIN_HOME_LATEST_DISPLAY_LIMIT)
      : [];

    if (!list.length) {
      return (
        <div className="w-full gap-6 flex-colo py-12">
          <div className="flex-colo w-24 h-24 p-5 mb-4 rounded-full bg-dry text-customPurple text-4xl">
            <RiMovie2Line />
          </div>
          <p className="text-border text-sm">No New Releases yet.</p>
        </div>
      );
    }

    return (
      <>
        <div
          className={`grid ${mobile
              ? 'grid-cols-2 gap-2'
              : 'xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 gap-4'
            }`}
        >
          {list.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            href="/movies"
            className="bg-customPurple hover:bg-transparent border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions"
          >
            Show More
          </Link>
        </div>

        {mobile ? (
          <EffectiveGateSquareAd
            refreshKey="home-mobile-newreleases"
            className="px-0"
          />
        ) : (
          <EffectiveGateNativeBanner refreshKey="home-desktop-newreleases" />
        )}
      </>
    );
  };

  const BrowseByContent = ({ mobile = false }) => (
    <>
      <BrowseSwiperSection
        title="Hollywood"
        browseByValues={[
          'British (English)',
          'Hollywood (English)',
          'Hollywood Web Series (English)',
        ]}
      />
      <BrowseSwiperSection
        title="Hollywood Hindi"
        browseByValues={[
          'Hollywood (Hindi Dubbed)',
          'Hollywood Web Series (Hindi Dubbed)',
          'Hollywood( Hindi Dubbed)',
        ]}
      />
      <BrowseSwiperSection
        title="Bollywood"
        browseByValues={[
          'Bollywood (Hindi)',
          'Bollywood Web Series (Hindi)',
          'Bollywood Web Series',
        ]}
      />
      <BrowseSwiperSection
        title="Korean Drama"
        browseByValues={['Korean Drama (Korean)']}
      />
      <BrowseSwiperSection title="Korean" browseByValues={['Korean (English)']} />
      <BrowseSwiperSection
        title="Korean Hindi"
        browseByValues={['Korean (Hindi Dubbed)']}
      />
      <BrowseSwiperSection
        title="Chinese Drama"
        browseByValues={['Chinease Drama']}
      />
      <BrowseSwiperSection
        title="Japanese"
        browseByValues={[
          'Japanese (Movies)',
          'Japanese Web Series',
          'Japanese Web Series (Hindi)',
        ]}
        excludeBrowseByValues={['Japanese Web Series (Hindi)']}
      />
      <BrowseSwiperSection
        title="Japanese Anime"
        browseByValues={['Japanese Anime']}
      />
      <BrowseSwiperSection
        title="South Indian"
        browseByValues={['South Indian (Hindi Dubbed)']}
      />
      <BrowseSwiperSection
        title="Punjabi"
        browseByValues={['Indian Punjabi Movies']}
      />

      {mobile ? (
        <EffectiveGateSquareAd
          refreshKey="home-mobile-browseby"
          className="px-0"
        />
      ) : (
        <EffectiveGateNativeBanner refreshKey="home-desktop-browseby" />
      )}

      <Promos />

      <div className="my-8">
        <h3 className="text-lg font-semibold mb-4">Top Rated</h3>
        <div
          className={`grid ${mobile
              ? 'grid-cols-2 gap-2'
              : 'xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 gap-4'
            }`}
        >
          {topRated.slice(0, 10).map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      </div>
    </>
  );

  if (!isAdmin || !token) return null;

  const showBanner = activeMobileTab !== 'browseBy';

  return (
    <div className="container mx-auto min-h-screen px-8 mobile:px-0 mb-6">
      {showBanner ? (
        <BannerSlider
          movies={bannerFeed}
          onRemoveFromBanner={
            canRemoveFromBanner ? handleRemoveFromBanner : undefined
          }
          removingBannerId={removingBannerId}
        />
      ) : null}

      {/* MOBILE */}
      <div className="sm:hidden my-4 px-4">
        {activeMobileTab === 'browseBy' ? (
          <BrowseByContent mobile />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveMobileHomeTab('latestNew')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border transitions ${activeMobileHomeTab === 'latestNew'
                    ? 'bg-customPurple text-white border-customPurple'
                    : 'bg-dry text-white border-border'
                  }`}
              >
                Trending
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileHomeTab('latestMovies')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border transitions ${activeMobileHomeTab === 'latestMovies'
                    ? 'bg-customPurple text-white border-customPurple'
                    : 'bg-dry text-white border-border'
                  }`}
              >
                New Releases
              </button>
            </div>

            {activeMobileHomeTab === 'latestNew' ? (
              <TrendingGrid mobile />
            ) : (
              <LatestGrid mobile />
            )}
          </>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block">
        <DesktopTabs />

        {activeDesktopTab === 'latestNew' && <TrendingGrid />}
        {activeDesktopTab === 'latest' && <LatestGrid />}
        {activeDesktopTab === 'browseBy' && <BrowseByContent />}
      </div>
    </div>
  );
}
