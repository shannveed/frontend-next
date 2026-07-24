// frontend-next/src/components/home/BrowseSwiperSection.jsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import {
  BsCaretLeftFill,
  BsCaretRightFill,
  BsCollectionFill,
} from 'react-icons/bs';

import MovieCard from '../movie/MovieCard';
import MobileGridSwiper from '../common/MobileGridSwiper';
import useInView from '../../lib/client/useInView';

const EMPTY_VALUES = Object.freeze([]);

// Keeps successfully loaded sections when navigating away and back.
// Failed sections are also remembered for the current browser session so they
// do not enter a retry/render loop.
const sectionCache = new Map();

const MAX_CONCURRENT_SECTION_FETCHES = 3;
let activeFetches = 0;
const fetchQueue = [];

const drainFetchQueue = () => {
  while (
    activeFetches < MAX_CONCURRENT_SECTION_FETCHES &&
    fetchQueue.length
  ) {
    const job = fetchQueue.shift();

    activeFetches += 1;

    Promise.resolve()
      .then(job.task)
      .then(job.resolve, job.reject)
      .finally(() => {
        activeFetches -= 1;
        drainFetchQueue();
      });
  }
};

const withFetchLimit = (task) =>
  new Promise((resolve, reject) => {
    fetchQueue.push({ task, resolve, reject });
    drainFetchQueue();
  });

const normalizeValues = (values = []) => {
  const seen = new Set();
  const out = [];

  for (const raw of Array.isArray(values) ? values : []) {
    const value = String(raw || '').trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(value);
  }

  return out;
};

const parseStableList = (key = '[]') => {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function BrowseSwiperSection({
  title,
  browseByValues = EMPTY_VALUES,
  excludeBrowseByValues = EMPTY_VALUES,
  limit = 20,
  lazyLoad = true,
  rootMargin = '300px',
}) {
  /**
   * Use serialized dependency keys rather than raw array references.
   * This prevents a new default [] array from restarting the effect after
   * every setLoading/setError render.
   */
  const browseValuesKey = JSON.stringify(normalizeValues(browseByValues));
  const excludeValuesKey = JSON.stringify(
    normalizeValues(excludeBrowseByValues)
  );

  const normalizedBrowseValues = useMemo(
    () => parseStableList(browseValuesKey),
    [browseValuesKey]
  );

  const normalizedExcludeValues = useMemo(
    () => parseStableList(excludeValuesKey),
    [excludeValuesKey]
  );

  const cacheKey = useMemo(
    () =>
      JSON.stringify({
        title: String(title || '').trim(),
        browseByValues: normalizedBrowseValues,
        excludeBrowseByValues: normalizedExcludeValues,
        limit: Number(limit) || 20,
      }),
    [
      title,
      browseValuesKey,
      excludeValuesKey,
      limit,
      normalizedBrowseValues,
      normalizedExcludeValues,
    ]
  );

  const initialCached = sectionCache.get(cacheKey);

  const [movies, setMovies] = useState(() =>
    Array.isArray(initialCached?.movies) ? initialCached.movies : []
  );

  const [loaded, setLoaded] = useState(() => Boolean(initialCached));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => initialCached?.error || '');

  const attemptedKeyRef = useRef(initialCached ? cacheKey : '');

  const swiperRef = useRef(null);
  const prevEl = useRef(null);
  const nextEl = useRef(null);

  const [sectionRef, inView] = useInView({
    rootMargin,
    once: true,
  });

  const shouldLoad = !lazyLoad || inView;

  // Reset correctly if this component is reused with different values.
  useEffect(() => {
    const cached = sectionCache.get(cacheKey);

    attemptedKeyRef.current = cached ? cacheKey : '';

    setMovies(Array.isArray(cached?.movies) ? cached.movies : []);
    setError(cached?.error || '');
    setLoaded(Boolean(cached));
    setLoading(false);
  }, [cacheKey]);

  useEffect(() => {
    if (!shouldLoad) return;
    if (loaded) return;
    if (attemptedKeyRef.current === cacheKey) return;

    if (!normalizedBrowseValues.length) {
      attemptedKeyRef.current = cacheKey;

      const entry = {
        movies: [],
        error: '',
      };

      sectionCache.set(cacheKey, entry);
      setLoaded(true);
      return;
    }

    attemptedKeyRef.current = cacheKey;

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        params.set('browseBy', normalizedBrowseValues.join(','));
        params.set('pageNumber', '1');

        const data = await withFetchLimit(async () => {
          const response = await fetch(`/api/movies?${params.toString()}`, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include',
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          });

          const text = await response.text().catch(() => '');
          let body = null;

          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            body = text;
          }

          if (!response.ok) {
            const message =
              body?.message ||
              (typeof body === 'string' ? body : '') ||
              `HTTP ${response.status}`;

            throw new Error(
              `Failed to load ${title || 'section'}: ${message}`
            );
          }

          return body;
        });

        if (cancelled) return;

        let nextMovies = Array.isArray(data?.movies) ? data.movies : [];

        if (normalizedExcludeValues.length) {
          const excluded = new Set(
            normalizedExcludeValues.map((value) =>
              String(value).toLowerCase()
            )
          );

          nextMovies = nextMovies.filter(
            (movie) =>
              !excluded.has(
                String(movie?.browseBy || '')
                  .trim()
                  .toLowerCase()
              )
          );
        }

        nextMovies = nextMovies.slice(0, Math.max(1, Number(limit) || 20));

        const entry = {
          movies: nextMovies,
          error: '',
        };

        sectionCache.set(cacheKey, entry);

        setMovies(nextMovies);
        setError('');
        setLoaded(true);
      } catch (fetchError) {
        if (cancelled || fetchError?.name === 'AbortError') return;

        const message =
          fetchError?.message || `Failed to load ${title || 'section'}`;

        console.warn('[browse-section]', message);

        const entry = {
          movies: [],
          error: message,
        };

        sectionCache.set(cacheKey, entry);

        setMovies([]);
        setError(message);
        setLoaded(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    cacheKey,
    shouldLoad,
    loaded,
    normalizedBrowseValues,
    normalizedExcludeValues,
    limit,
    title,
  ]);

  useEffect(() => {
    const swiper = swiperRef.current?.swiper;

    if (!swiper || !prevEl.current || !nextEl.current) return;

    swiper.params.navigation.prevEl = prevEl.current;
    swiper.params.navigation.nextEl = nextEl.current;

    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  }, [movies.length]);

  const showMoreHref = useMemo(() => {
    const params = new URLSearchParams();

    if (normalizedBrowseValues.length) {
      params.set('browseBy', normalizedBrowseValues.join(','));
    }

    const query = params.toString();
    return query ? `/movies?${query}` : '/movies';
  }, [browseValuesKey, normalizedBrowseValues]);

  const canLoop = movies.length >= 7;
  const showSkeleton = lazyLoad && !inView && !movies.length;

  // Preserve existing behavior: a failed individual browse section stays hidden.
  if (loaded && error && !movies.length) {
    return null;
  }

  return (
    <section ref={sectionRef} className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BsCollectionFill />
          <h3 className="font-semibold">{title}</h3>
        </div>

        <Link
          href={showMoreHref}
          className="text-sm text-white hover:text-customPurple transitions"
        >
          Show More
        </Link>
      </div>

      {showSkeleton ? (
        <div className="bg-dry border border-border rounded-lg p-4">
          <div className="h-4 w-36 bg-main/60 rounded mb-4" />
          <div className="h-[220px] bg-main/40 rounded" />
        </div>
      ) : loading && !movies.length ? (
        <div className="bg-dry border border-border rounded-lg p-4">
          <p className="text-dryGray text-sm">Loading...</p>
        </div>
      ) : movies.length ? (
        <>
          <div className="sm:hidden">
            <MobileGridSwiper movies={movies.slice(0, limit)} />
          </div>

          <div className="hidden sm:block relative">
            <Swiper
              ref={swiperRef}
              modules={[Navigation, Autoplay]}
              navigation={{
                prevEl: prevEl.current,
                nextEl: nextEl.current,
              }}
              onBeforeInit={(swiper) => {
                swiper.params.navigation.prevEl = prevEl.current;
                swiper.params.navigation.nextEl = nextEl.current;
              }}
              autoplay={
                movies.length > 1
                  ? {
                    delay: 3000,
                    disableOnInteraction: false,
                  }
                  : false
              }
              loop={canLoop}
              speed={250}
              spaceBetween={16}
              watchOverflow
              breakpoints={{
                640: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
                1280: { slidesPerView: 5 },
              }}
            >
              {movies.slice(0, limit).map((movie) => (
                <SwiperSlide
                  key={
                    movie?._id ||
                    movie?.slug ||
                    `${movie?.name}-${movie?.year}`
                  }
                >
                  <MovieCard movie={movie} showLike />
                </SwiperSlide>
              ))}
            </Swiper>

            {movies.length > 1 ? (
              <>
                <button
                  ref={prevEl}
                  aria-label="Previous"
                  type="button"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex-colo bg-customPurple/70 hover:bg-customPurple text-white rounded-full"
                >
                  <BsCaretLeftFill />
                </button>

                <button
                  ref={nextEl}
                  aria-label="Next"
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex-colo bg-customPurple/70 hover:bg-customPurple text-white rounded-full"
                >
                  <BsCaretRightFill />
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="bg-dry border border-border rounded-lg p-4">
          <p className="text-dryGray text-sm">
            No titles found in this collection.
          </p>
        </div>
      )}
    </section>
  );
}
