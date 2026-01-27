// src/components/watch/WatchClient.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BsCollectionFill } from 'react-icons/bs';


import { BiArrowBack } from 'react-icons/bi';
import {
  FaCloudDownloadAlt,
  FaHeart,
  FaLock,
  FaListUl,
  FaPlay,
} from 'react-icons/fa';
import { TbPlayerTrackNext, TbPlayerTrackPrev } from 'react-icons/tb';
import { IoClose } from 'react-icons/io5';
import { RiMovie2Line } from 'react-icons/ri';

import Loader from '../common/Loader';
import MovieCard from '../movie/MovieCard';
import StarRatingInput from './StarRatingInput';

import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

import { getUserInfo } from '../../lib/client/auth';
import { getFavorites, likeMovie } from '../../lib/client/users';
import { getMyMovieRating, upsertMovieRating } from '../../lib/client/ratings';
import {
  getMovieByIdAdmin,
  getRelatedMoviesAdmin,
} from '../../lib/client/moviesAdmin';
import { apiFetch } from '../../lib/client/apiFetch';

const normalizeSeasonNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

const groupEpisodesBySeason = (episodes = []) => {
  const map = new Map();

  for (const ep of episodes || []) {
    const season = normalizeSeasonNumber(ep?.seasonNumber);
    if (!map.has(season)) map.set(season, []);
    map.get(season).push(ep);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([seasonNumber, eps]) => ({
      seasonNumber,
      episodes: (eps || [])
        .slice()
        .sort((a, b) => (a?.episodeNumber || 0) - (b?.episodeNumber || 0)),
    }));
};

const getFirstAvailableServerIndex = (servers = []) =>
  servers.findIndex((s) => s && typeof s.url === 'string' && s.url.trim());

const safeGetPublicMovie = async (idOrSlug) => {
  const safe = encodeURIComponent(String(idOrSlug || '').trim());
  if (!safe) return null;

  try {
    return await apiFetch(`/api/movies/${safe}`);
  } catch (e) {
    const msg = String(e?.message || '');
    if (/movie not found/i.test(msg)) return null;
    if (/not found/i.test(msg)) return null;
    throw e;
  }
};

const safeGetPublicRelated = async (idOrSlug, limit = 20) => {
  const safe = encodeURIComponent(String(idOrSlug || '').trim());
  if (!safe) return [];
  try {
    return await apiFetch(`/api/movies/related/${safe}?limit=${limit}`);
  } catch {
    return [];
  }
};

export default function WatchClient({
  slug,
  initialMovie = null,
  initialRelated = [],
}) {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  const [movie, setMovie] = useState(initialMovie);
  const [related, setRelated] = useState(
    Array.isArray(initialRelated) ? initialRelated : []
  );
  const [loading, setLoading] = useState(!initialMovie);
  const [error, setError] = useState('');

  // playback + guest limit
  const [play, setPlay] = useState(false);
  const [guestWatchTime, setGuestWatchTime] = useState(0);
  const [hasShownLoginPrompt, setHasShownLoginPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // like state
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  // 3 servers
  const [currentServerIndex, setCurrentServerIndex] = useState(0);

  // webseries UX
  const [activeSeason, setActiveSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);

  // ratings
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [myRatingLoading, setMyRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // userInfo from localStorage (CRA login)
  useEffect(() => {
    setUserInfo(getUserInfo());
    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // If server couldn't fetch (draft / not found), try on client (public then admin)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (movie || !slug) return;

      try {
        setLoading(true);
        setError('');

        const pub = await safeGetPublicMovie(slug);
        if (cancelled) return;

        if (pub) {
          setMovie(pub);
          return;
        }

        if (token && isAdmin) {
          const adminMovie = await getMovieByIdAdmin(token, slug);
          if (cancelled) return;

          if (adminMovie) {
            setMovie(adminMovie);
            const rel = await getRelatedMoviesAdmin(
              token,
              adminMovie.slug || adminMovie._id,
              20
            ).catch(() => []);
            setRelated(Array.isArray(rel) ? rel : []);
            return;
          }
        }

        setError('Movie not found');
      } catch (e) {
        setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, movie, token, isAdmin]);

  // Keep canonical slug for client-fetched content too
  useEffect(() => {
    if (!movie?.slug || !slug) return;
    if (movie.slug !== slug) router.replace(`/watch/${movie.slug}`);
  }, [movie?.slug, slug, router]);

  // Fetch related if server didn't provide
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!movie?._id) return;
      if (related?.length) return;

      // if admin token exists, prefer admin-related (matches CRA)
      if (token && isAdmin) {
        const rel = await getRelatedMoviesAdmin(token, movie.slug || movie._id, 20).catch(
          () => []
        );
        if (!cancelled) setRelated(Array.isArray(rel) ? rel : []);
        return;
      }

      const rel = await safeGetPublicRelated(movie.slug || movie._id, 20);
      if (!cancelled) setRelated(Array.isArray(rel) ? rel : []);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [movie?._id, movie?.slug, related?.length, token, isAdmin]);

  // liked state
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token || !movie?._id) {
        setLiked(false);
        return;
      }

      try {
        const favs = await getFavorites(token);
        if (cancelled) return;

        const ok = Array.isArray(favs)
          ? favs.some((m) => String(m?._id) === String(movie._id))
          : false;

        setLiked(ok);
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, movie?._id]);

  // ✅ modals: lock body scroll like CRA
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (showLoginModal || showEpisodePicker) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showLoginModal, showEpisodePicker]);

  // guest 13-minute limit
  useEffect(() => {
    let interval;

    if (play && !token) {
      interval = setInterval(() => {
        setGuestWatchTime((prev) => {
          const next = prev + 1;

          if (next >= 780 && !hasShownLoginPrompt) {
            setHasShownLoginPrompt(true);

            try {
              localStorage.setItem(
                'redirectAfterLogin',
                JSON.stringify({
                  pathname: `/watch/${movie?.slug || movie?._id || slug}`,
                  search: '',
                  hash: '',
                  scrollY: window.scrollY,
                })
              );
            } catch {}

            setShowLoginModal(true);
          }

          return next;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [play, token, hasShownLoginPrompt, movie?._id, movie?.slug, slug]);

  // WebSeries seasons
  const seasons = useMemo(() => {
    if (movie?.type !== 'WebSeries') return [];
    return groupEpisodesBySeason(Array.isArray(movie?.episodes) ? movie.episodes : []);
  }, [movie?.type, movie?.episodes]);

  const activeSeasonEpisodes = useMemo(() => {
    if (movie?.type !== 'WebSeries') return [];
    const s = seasons.find((x) => x.seasonNumber === activeSeason);
    return s?.episodes || [];
  }, [movie?.type, seasons, activeSeason]);

  const filteredEpisodes = useMemo(() => {
    if (movie?.type !== 'WebSeries') return [];
    const term = episodeSearch.trim().toLowerCase();
    if (!term) return activeSeasonEpisodes;

    return activeSeasonEpisodes.filter((ep) => {
      const num = String(ep?.episodeNumber || '');
      const title = String(ep?.title || '').toLowerCase();
      return num.includes(term) || title.includes(term);
    });
  }, [movie?.type, activeSeasonEpisodes, episodeSearch]);

  // initial season+episode for series
  useEffect(() => {
    if (movie?.type !== 'WebSeries') {
      setActiveSeason(1);
      setCurrentEpisode(null);
      return;
    }

    if (!seasons.length) {
      setActiveSeason(1);
      setCurrentEpisode(null);
      return;
    }

    const firstSeason = seasons[0]?.seasonNumber || 1;
    setActiveSeason(firstSeason);

    const firstEp = seasons[0]?.episodes?.[0] || null;
    setCurrentEpisode(firstEp);

    setEpisodeSearch('');
    setCurrentServerIndex(0);
  }, [movie?._id, movie?.type, seasons]);

  // Ensure current episode belongs to active season
  useEffect(() => {
    if (movie?.type !== 'WebSeries') return;

    const s = seasons.find((x) => x.seasonNumber === activeSeason);
    if (!s) return;

    const exists = s.episodes.some(
      (ep) => String(ep?._id) === String(currentEpisode?._id)
    );

    if (!exists) {
      setCurrentEpisode(s.episodes[0] || null);
    }
  }, [activeSeason, seasons, movie?.type, currentEpisode?._id]);

  const selectEpisode = useCallback((ep) => {
    if (!ep) return;
    setCurrentEpisode(ep);
    setShowEpisodePicker(false);
    // keep playing state; iframe key will change so it reloads
  }, []);

  const currentEpisodeIndex = useMemo(() => {
    if (!currentEpisode) return -1;
    return activeSeasonEpisodes.findIndex(
      (ep) => String(ep?._id) === String(currentEpisode?._id)
    );
  }, [activeSeasonEpisodes, currentEpisode]);

  const hasPrevEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode =
    currentEpisodeIndex !== -1 &&
    currentEpisodeIndex < activeSeasonEpisodes.length - 1;

  const goPrevEpisode = () => {
    if (!hasPrevEpisode) return;
    selectEpisode(activeSeasonEpisodes[currentEpisodeIndex - 1]);
  };

  const goNextEpisode = () => {
    if (!hasNextEpisode) return;
    selectEpisode(activeSeasonEpisodes[currentEpisodeIndex + 1]);
  };

  // servers (movie or episode)
  const movieServers = useMemo(
    () => [
      { label: 'Server 1', url: movie?.video || '' },
      { label: 'Server 2', url: movie?.videoUrl2 || '' },
      { label: 'Server 3', url: movie?.videoUrl3 || '' },
    ],
    [movie?.video, movie?.videoUrl2, movie?.videoUrl3]
  );

  const episodeServers = useMemo(
    () => [
      { label: 'Server 1', url: currentEpisode?.video || '' },
      { label: 'Server 2', url: currentEpisode?.videoUrl2 || '' },
      { label: 'Server 3', url: currentEpisode?.videoUrl3 || '' },
    ],
    [currentEpisode?.video, currentEpisode?.videoUrl2, currentEpisode?.videoUrl3]
  );

  const activeServers = movie?.type === 'Movie' ? movieServers : episodeServers;

  // ensure current server points to an available URL
  useEffect(() => {
    if (!activeServers?.length) return;

    const curUrl = activeServers[currentServerIndex]?.url;
    if (curUrl && curUrl.trim()) return;

    const first = getFirstAvailableServerIndex(activeServers);
    if (first !== -1 && first !== currentServerIndex) setCurrentServerIndex(first);
  }, [activeServers, currentServerIndex]);

  const activeVideoUrl =
    activeServers[currentServerIndex]?.url ||
    activeServers[getFirstAvailableServerIndex(activeServers)]?.url ||
    '';

  const handleServerSelect = (idx) => {
    const url = activeServers[idx]?.url;
    if (!url) return;
    setCurrentServerIndex(idx);
  };

  const handlePlayClick = () => {
    if (!movie) return;

    if (movie.type === 'WebSeries' && !currentEpisode) {
      toast.error('No episode selected');
      return;
    }

    if (!activeVideoUrl) {
      toast.error('No playable server available for this title');
      return;
    }

    setPlay(true);
  };

  // rating: load my rating
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!movie?._id || !token) {
        setRatingValue(0);
        setRatingComment('');
        return;
      }

      try {
        setMyRatingLoading(true);

        const idOrSlug = movie.slug || movie._id || slug;
        const data = await getMyMovieRating(token, idOrSlug);

        if (cancelled) return;

        const r = data?.rating;
        setRatingValue(r?.rating || 0);
        setRatingComment(r?.comment || '');
      } catch {
        // ignore
      } finally {
        if (!cancelled) setMyRatingLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [movie?._id, movie?.slug, token, slug]);

  const submitRating = async () => {
    if (!movie?._id) return;

    if (!token) {
      toast.error('Please login to rate');
      window.location.href = '/login';
      return;
    }

    if (!ratingValue || ratingValue < 1) {
      toast.error('Please select a star rating');
      return;
    }

    try {
      setRatingSubmitting(true);

      const idOrSlug = movie.slug || movie._id || slug;
      await upsertMovieRating(token, idOrSlug, ratingValue, ratingComment);

      toast.success('Thanks! Your rating has been saved.');
    } catch (e) {
      toast.error(e?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const doLike = async () => {
    const tokenNow = getUserInfo()?.token;
    if (!tokenNow) {
      toast.error('Please login to add to favorites');
      window.location.href = '/login';
      return;
    }

    if (!movie?._id) return;

    try {
      setLiking(true);
      await likeMovie(tokenNow, { movieId: movie._id });
      setLiked(true);
      toast.success('Added to your favorites');
    } catch (e) {
      toast.error(e?.message || 'Failed to add to favorites');
    } finally {
      setLiking(false);
    }
  };

  const doDownload = () => {
    if (!movie?.downloadUrl) return;

    // CRA behavior: WatchPage requires login to download
    if (!token) {
      toast.error('Please login to download');
      window.location.href = '/login';
      return;
    }

    window.location.href = movie.downloadUrl;
  };

  const handleBackClick = () => router.back();

  // related list to show
  const relatedToShow = useMemo(() => {
    const list = Array.isArray(related) ? related : [];
    return list.filter((m) => String(m?._id) !== String(movie?._id)).slice(0, 20);
  }, [related, movie?._id]);

  if (loading) {
    return (
      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        <Loader />
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        <div className="w-full gap-6 flex-colo py-12">
          <div className="flex-colo w-24 h-24 p-5 mb-4 rounded-full bg-dry text-customPurple text-4xl">
            <RiMovie2Line />
          </div>
          <p className="text-border text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!movie) return null;

  const poster = movie?.image || movie?.titleImage || '/images/placeholder.jpg';

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      {/* Guest Login Prompt Modal (CRA style) */}
      {!token && showLoginModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 px-4 py-6 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center mobile:landscape:items-start">
            <div className="bg-dry rounded-lg shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto p-6 mobile:landscape:max-w-lg mobile:landscape:p-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-customPurple/20 flex items-center justify-center">
                  <FaLock className="text-customPurple text-2xl" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                  Continue watching - please log in
                </h2>

                <p className="text-text text-sm mb-4">
                  Sign in for free to keep watching in HD and access downloads.
                </p>

                <div className="bg-main rounded-lg p-4 mb-4 text-left">
                  <p className="text-dryGray text-xs mb-3">
                    You've reached the preview limit for guests. Log in for free
                    to continue watching without interruptions, save favorites,
                    and more.
                  </p>

                  <ul className="space-y-2 text-sm text-white">
                    <li className="flex items-center gap-2">
                      <span className="text-customPurple">✓</span> HD streaming
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-customPurple">✓</span> Watch from where you left
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-customPurple">✓</span> Download available
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-customPurple">✓</span> Add to favorites
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => (window.location.href = '/login')}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-customPurple text-white hover:bg-opacity-90 border-2 border-customPurple transitions flex items-center justify-center gap-2"
                  type="button"
                >
                  Login now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Episode Picker (CRA style) */}
      {movie?.type === 'WebSeries' && showEpisodePicker && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70"
          onClick={() => setShowEpisodePicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-dry border-t border-border rounded-t-2xl p-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-white font-semibold truncate">Select Episode</h3>
                <p className="text-xs text-dryGray truncate">
                  Season {activeSeason} • {activeSeasonEpisodes.length} episodes
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEpisodePicker(false)}
                className="w-10 h-10 flex-colo rounded-md bg-main border border-border text-white"
                aria-label="Close"
              >
                <IoClose />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <select
                value={activeSeason}
                onChange={(e) => {
                  setEpisodeSearch('');
                  setActiveSeason(Number(e.target.value));
                }}
                className="flex-1 bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
              >
                {seasons.map((s) => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    Season {s.seasonNumber} ({s.episodes.length})
                  </option>
                ))}
              </select>

              <input
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder="Search ep..."
                className="flex-1 bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
              />
            </div>

            <div className="overflow-y-auto max-h-[62vh] pr-1">
              <div className="grid grid-cols-2 gap-2">
                {filteredEpisodes.map((ep) => {
                  const active = String(ep._id) === String(currentEpisode?._id);
                  return (
                    <button
                      key={ep._id}
                      type="button"
                      onClick={() => selectEpisode(ep)}
                      className={`text-left p-3 rounded-lg border transitions ${
                        active
                          ? 'bg-customPurple border-customPurple text-white'
                          : 'bg-main border-border text-white hover:border-customPurple'
                      }`}
                    >
                      <p className="text-sm font-semibold">Ep {ep.episodeNumber}</p>
                      {ep.title ? (
                        <p className="text-xs text-dryGray line-clamp-2 mt-1">{ep.title}</p>
                      ) : (
                        <p className="text-xs text-dryGray mt-1">Tap to play</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-dry p-6 mobile:p-4 mb-12 rounded-lg">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={handleBackClick}
            className="sm:w-16 sm:h-16 w-10 h-10 flex-colo transitions hover:bg-customPurple rounded-md bg-main text-white flex-shrink-0"
            type="button"
          >
            <BiArrowBack className="sm:text-2xl text-lg" />
          </button>

          <div className="flex flex-1 items-center gap-3 min-w-0">
            <h1 className="sm:text-xl font-semibold truncate flex-1">{movie?.name}</h1>

            <button
              onClick={doLike}
              disabled={liked || liking}
              className={`sm:hidden w-10 h-10 mobile:w-9 mobile:h-9 flex-colo rounded-md transitions ml-auto flex-shrink-0
                ${
                  liked
                    ? 'bg-customPurple text-white'
                    : 'bg-dry border border-border text-white hover:bg-customPurple'
                }`}
              type="button"
            >
              <FaHeart className="text-base mobile:text-sm" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 ml-auto">
            <button
              onClick={doLike}
              disabled={liked || liking}
              className={`w-12 h-12 flex-colo rounded-md transitions
                ${
                  liked
                    ? 'bg-customPurple text-white'
                    : 'bg-dry border border-border text-white hover:bg-customPurple'
                }`}
              type="button"
            >
              <FaHeart />
            </button>

            {movie.type === 'Movie' && movie.downloadUrl && (
              <button
                onClick={doDownload}
                className="items-center gap-3 bg-customPurple hover:bg-transparent border-2 border-customPurple transitions text-white px-4 py-3 rounded font-medium hidden sm:flex"
                type="button"
              >
                <FaCloudDownloadAlt className="text-xl" /> Download
              </button>
            )}
          </div>

          {movie.type === 'Movie' && movie.downloadUrl && (
            <button
              onClick={doDownload}
              className="sm:hidden flex items-center justify-center gap-2 bg-customPurple hover:bg-transparent border-2 border-customPurple transitions text-white px-3 py-2 rounded font-medium text-sm flex-shrink-0"
              type="button"
            >
              <FaCloudDownloadAlt className="text-base" /> Download
            </button>
          )}
        </div>

        {/* WebSeries season + episode controls */}
        {movie.type === 'WebSeries' && (
          <div className="mb-4 space-y-3">
            {/* Desktop season pills */}
            <div className="hidden sm:flex flex-wrap gap-2">
              {seasons.map((s) => (
                <button
                  key={s.seasonNumber}
                  type="button"
                  onClick={() => {
                    setEpisodeSearch('');
                    setActiveSeason(s.seasonNumber);
                  }}
                  className={`px-4 py-2 rounded-md font-medium border transitions ${
                    activeSeason === s.seasonNumber
                      ? 'bg-customPurple text-white border-customPurple'
                      : 'bg-main text-white border-border hover:border-customPurple'
                  }`}
                >
                  Season {s.seasonNumber} ({s.episodes.length})
                </button>
              ))}
            </div>

            {/* Mobile season select + episode picker */}
            <div className="sm:hidden flex gap-2">
              <select
                value={activeSeason}
                onChange={(e) => {
                  setEpisodeSearch('');
                  setActiveSeason(Number(e.target.value));
                }}
                className="flex-1 bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
              >
                {seasons.map((s) => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    Season {s.seasonNumber} ({s.episodes.length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowEpisodePicker(true)}
                className="px-3 py-2 rounded bg-main border border-border text-white flex items-center gap-2"
              >
                <FaListUl />
                Episodes
              </button>
            </div>

            {/* current episode + prev/next */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-dryGray truncate">
                {currentEpisode
                  ? `Season ${activeSeason} • Episode ${currentEpisode.episodeNumber}${
                      currentEpisode.title ? ` — ${currentEpisode.title}` : ''
                    }`
                  : `Season ${activeSeason}`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevEpisode}
                  disabled={!hasPrevEpisode}
                  className="px-3 py-2 rounded bg-main border border-border text-white flex items-center gap-2 disabled:opacity-50"
                >
                  <TbPlayerTrackPrev />
                  Prev
                </button>

                <button
                  type="button"
                  onClick={goNextEpisode}
                  disabled={!hasNextEpisode}
                  className="px-3 py-2 rounded bg-main border border-border text-white flex items-center gap-2 disabled:opacity-50"
                >
                  Next
                  <TbPlayerTrackNext />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3-Server buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          {activeServers.map((server, idx) => {
            const enabled = !!server.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleServerSelect(idx)}
                disabled={!enabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md font-medium transitions border
                  ${
                    currentServerIndex === idx
                      ? 'bg-customPurple text-white border-customPurple'
                      : 'bg-dry text-white border-border hover:border-customPurple'
                  }
                  ${enabled ? '' : 'opacity-50 cursor-not-allowed'}
                `}
              >
                <span className="text-[10px] px-1.5 py-0.5 bg-main rounded">HD</span>
                {server.label}
              </button>
            );
          })}
        </div>

        {/* Player */}
        <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: '56.25%' }}>
          {play ? (
            <iframe
              key={`${movie?._id}:${movie?.type}:${activeSeason}:${
                currentEpisode?._id || 'movie'
              }:${currentServerIndex}:${activeVideoUrl}`}
              title="Player"
              src={activeVideoUrl}
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full">
              <div
                className="w-full h-full rounded-lg overflow-hidden relative bg-main"
                style={{
                  backgroundImage: `url(${poster})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 flex-colo bg-black/40">
                  <button
                    onClick={handlePlayClick}
                    className="bg-white text-customPurple flex-colo border border-customPurple rounded-full w-20 h-20 font-medium text-xl hover:bg-customPurple hover:text-white transitions"
                    type="button"
                  >
                    <FaPlay />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop episode list */}
        {movie.type === 'WebSeries' && (
          <div className="hidden sm:block mt-6 bg-main border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-white font-semibold">
                Episodes — Season {activeSeason}
              </h3>
              <input
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder="Search episode..."
                className="bg-dry border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple w-64"
              />
            </div>

            <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredEpisodes.map((ep) => {
                const active = String(ep._id) === String(currentEpisode?._id);
                return (
                  <button
                    key={ep._id}
                    type="button"
                    onClick={() => selectEpisode(ep)}
                    className={`text-left p-3 rounded-lg border transitions ${
                      active
                        ? 'bg-customPurple border-customPurple text-white'
                        : 'bg-dry border-border text-white hover:border-customPurple'
                    }`}
                  >
                    <p className="text-sm font-semibold">Ep {ep.episodeNumber}</p>
                    {ep.title ? (
                      <p className="text-xs text-dryGray line-clamp-2 mt-1">{ep.title}</p>
                    ) : (
                      <p className="text-xs text-dryGray mt-1">Tap to play</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating row */}
        <div className="mt-6 bg-main border border-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-white font-semibold text-sm shrink-0">
              Rate this {movie.type === 'WebSeries' ? 'series' : 'movie'}:
            </p>

            <StarRatingInput
              value={ratingValue}
              onChange={setRatingValue}
              disabled={myRatingLoading || ratingSubmitting}
              className="shrink-0"
            />

            <input
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Comment (optional)"
              maxLength={300}
              className="flex-1 bg-dry border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
            />

            <button
              type="button"
              onClick={submitRating}
              disabled={myRatingLoading || ratingSubmitting}
              className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
            >
              {ratingSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {!token && (
            <p className="text-xs text-dryGray mt-2">
              Login is required to submit a rating.
            </p>
          )}
        </div>

        {/* Ads below player (same placement as CRA) */}
        <EffectiveGateNativeBanner
          refreshKey={`watch-desktop-${movie?.slug || movie?._id || slug}`}
        />
        <EffectiveGateSquareAd
          refreshKey={`watch-mobile-${movie?.slug || movie?._id || slug}`}
          className="sm:hidden"
        />

        {/* Related */}
        <div className="my-16">
          <div className="flex items-center gap-2 mb-6">
            <BsCollectionFill />
            <h3 className="text-white font-semibold">Related Movies</h3>
          </div>

          {relatedToShow.length > 0 ? (
            <>
              <div className="grid sm:mt-6 mt-4 xl:grid-cols-5 2xl:grid-cols-5 lg:grid-cols-3 sm:grid-cols-5 mobile:grid-cols-2 mobile:gap-3  gap-4">
                {relatedToShow.map((m) => (
                  <MovieCard key={m._id} movie={m} />
                ))}
              </div>

              <div className="flex justify-center mt-10">
                <Link
                  href="/movies"
                  className="bg-customPurple hover:bg-transparent border-2 border-customPurple transitions text-white px-8 py-3 rounded font-medium"
                >
                  Show More
                </Link>
              </div>
            </>
          ) : (
            <p className="text-border text-sm mt-6">No related titles found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

