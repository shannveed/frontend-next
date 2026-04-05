'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaHeart } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

import SafeImage from '../common/SafeImage';
import FlexMovieItems from '../movie/FlexMovieItems';
import { getUserInfo } from '../../lib/client/auth';
import { likeMovie } from '../../lib/client/users';

const WRAPPER_CLASS =
  'w-full xl:h-[530px] bg-dry lg:h-96 h-80 mobile:h-[calc(100vw*0.645)]';

function EmptyBanner() {
  return (
    <div className={`${WRAPPER_CLASS} rounded-lg flex-colo`}>
      <p className="text-border text-sm">No banner titles yet.</p>
    </div>
  );
}

function StaticBannerHero({
  movie,
  canRemove,
  onRemoveFromBanner,
  removingBannerId,
  likingId,
  liked,
  onLike,
}) {
  if (!movie) return <EmptyBanner />;

  const seg = movie.slug || movie._id;

  return (
    <div className={`relative ${WRAPPER_CLASS} overflow-hidden rounded-lg`}>
      {/* Admin remove */}
      {canRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemoveFromBanner?.(movie._id);
          }}
          disabled={removingBannerId === movie._id}
          className="absolute top-3 right-3 z-30 w-10 h-10 flex-colo rounded-full bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-60"
          aria-label="Remove from banner"
        >
          {removingBannerId === movie._id ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <IoClose className="text-xl" />
          )}
        </button>
      ) : null}

      {/* Static-first hero image for fast LCP */}
      <SafeImage
        src={movie?.image}
        fallbackCandidates={[movie?.titleImage, '/images/placeholder.jpg']}
        alt={movie?.name || 'Banner'}
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover"
      />

      {/* Mobile dark overlay */}
      <div className="sm:hidden absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Desktop overlay */}
      <div className="hidden sm:flex absolute linear-bg xl:pl-52 sm:pl-32 pl-8 top-0 bottom-0 right-0 left-0 flex-col justify-center lg:gap-4 md:gap-3 gap-2">
        <h2 className="xl:text-3xl sm:text-xl text-lg font-bold leading-tight">
          {movie?.name}
        </h2>

        <FlexMovieItems movie={movie} />

        <div className="flex gap-3 items-center">
          <Link
            href={`/movie/${seg}`}
            className="bg-customPurple hover:text-main transitions text-white px-8 py-2 rounded font-semibold text-sm"
          >
            Watch
          </Link>

          <button
            onClick={() => onLike?.(movie)}
            disabled={likingId === movie._id || liked}
            className="bg-white hover:text-customPurple transitions px-4 py-3 rounded text-sm bg-opacity-30 text-white disabled:opacity-60"
            type="button"
            aria-label="Like"
          >
            {likingId === movie._id ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
            ) : (
              <FaHeart />
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <div className="sm:hidden absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2 flex flex-col gap-1.5 z-10">
        <h2 className="text-sm font-semibold leading-tight line-clamp-3 text-white">
          {movie?.name}
        </h2>

        <FlexMovieItems movie={movie} className="text-sm leading-tight" />

        <div className="flex items-center gap-3">
          <Link
            href={`/movie/${seg}`}
            className="flex-1 bg-customPurple hover:bg-opacity-80 transition text-white text-sm py-3 rounded text-center"
          >
            Watch
          </Link>

          <button
            onClick={() => onLike?.(movie)}
            disabled={likingId === movie._id || liked}
            className="w-10 h-10 flex-colo rounded bg-white bg-opacity-30 text-white disabled:opacity-60"
            type="button"
            aria-label="Like"
          >
            {likingId === movie._id ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
            ) : (
              <FaHeart className="text-sm" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerSlider({ movies = [], onRemoveFromBanner, removingBannerId }) {
  const [InteractiveCmp, setInteractiveCmp] = useState(null);
  const [likingId, setLikingId] = useState(null);
  const [likedIds, setLikedIds] = useState([]);

  const list = useMemo(() => {
    return Array.isArray(movies) ? movies.filter(Boolean).slice(0, 10) : [];
  }, [movies]);

  const firstMovie = list[0] || null;
  const canRemove = typeof onRemoveFromBanner === 'function';

  const handleLike = useCallback(async (movie) => {
    const userInfo = getUserInfo();
    const token = userInfo?.token;

    if (!token) {
      toast.error('Please login to add to favorites');
      window.location.href = '/login';
      return;
    }

    if (!movie?._id) return;
    if (likedIds.includes(String(movie._id))) return;

    try {
      setLikingId(movie._id);
      await likeMovie(token, { movieId: movie._id });

      setLikedIds((prev) =>
        prev.includes(String(movie._id))
          ? prev
          : [...prev, String(movie._id)]
      );

      toast.success('Added to your favorites');
    } catch (e) {
      toast.error(e?.message || 'Failed to add to favorites');
    } finally {
      setLikingId(null);
    }
  }, [likedIds]);

  useEffect(() => {
    if (list.length <= 1) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let rafId = null;
    let idleId = null;
    let timeoutId = null;

    const loadInteractiveCarousel = async () => {
      if (cancelled) return;

      try {
        const mod = await import('./BannerSliderInteractive');
        if (!cancelled) {
          setInteractiveCmp(() => mod.default);
        }
      } catch {
        // keep static hero if interactive chunk fails
      }
    };

    rafId = window.requestAnimationFrame(() => {
      const prefersReducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(loadInteractiveCarousel, {
          timeout: 1500,
        });
      } else {
        timeoutId = window.setTimeout(loadInteractiveCarousel, 900);
      }
    });

    return () => {
      cancelled = true;

      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);

      if (
        idleId !== null &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [list.length]);

  if (!list.length) return <EmptyBanner />;

  // Upgrade to interactive carousel only after first paint + idle load
  if (InteractiveCmp && list.length > 1) {
    return (
      <InteractiveCmp
        movies={list}
        onRemoveFromBanner={onRemoveFromBanner}
        removingBannerId={removingBannerId}
      />
    );
  }

  return (
    <StaticBannerHero
      movie={firstMovie}
      canRemove={canRemove}
      onRemoveFromBanner={onRemoveFromBanner}
      removingBannerId={removingBannerId}
      likingId={likingId}
      liked={likedIds.includes(String(firstMovie?._id || ''))}
      onLike={handleLike}
    />
  );
}

export default memo(BannerSlider);
