'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
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

// simple in-memory cache (keeps sections filled when navigating away/back)
const cache = new Map();

/**
 * Avoid 10–12 parallel "section" fetches (kills mobile + serverless).
 * Limit to 3 concurrent requests globally.
 */
const MAX_CONCURRENT_SECTION_FETCHES = 3;
let activeFetches = 0;
const queue = [];

const runNext = () => {
  if (activeFetches >= MAX_CONCURRENT_SECTION_FETCHES) return;
  const job = queue.shift();
  if (job) job();
};

const withFetchLimit = (fn) =>
  new Promise((resolve, reject) => {
    const run = async () => {
      activeFetches += 1;
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      } finally {
        activeFetches -= 1;
        runNext();
      }
    };

    if (activeFetches < MAX_CONCURRENT_SECTION_FETCHES) run();
    else queue.push(run);
  });

export default function BrowseSwiperSection({
  title,
  browseByValues = [],
  excludeBrowseByValues = [],
  limit = 20,

  // ✅ NEW: lazy-load (default true)
  lazyLoad = true,
  rootMargin = '300px',
}) {
  const key = useMemo(
    () => JSON.stringify({ browseByValues, excludeBrowseByValues, limit }),
    [browseByValues, excludeBrowseByValues, limit]
  );

  const cached = cache.get(key);

  const [movies, setMovies] = useState(() => cached?.movies || []);
  const [loaded, setLoaded] = useState(() => !!cached?.movies?.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(cached?.error || '');

  // Swiper navigation
  const swiperRef = useRef(null);
  const prevEl = useRef(null);
  const nextEl = useRef(null);

  // Lazy-load trigger
  const [sectionRef, inView] = useInView({ rootMargin, once: true });
  const shouldLoad = !lazyLoad || inView;

  useEffect(() => {
    if (loaded) return;
    if (!shouldLoad) return;
    if (cache.get(key)?.movies?.length) {
      const c = cache.get(key);
      setMovies(c.movies);
      setError('');
      setLoaded(true);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError('');

        const browseParam = encodeURIComponent(browseByValues.join(','));

        const data = await withFetchLimit(async () => {
          const res = await fetch(
            `/api/movies?browseBy=${browseParam}&pageNumber=1`,
            { signal: controller.signal }
          );

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `Failed to load ${title}`);
          }

          return res.json();
        });

        let list = Array.isArray(data?.movies) ? data.movies : [];

        if (excludeBrowseByValues.length) {
          const exclude = new Set(
            excludeBrowseByValues.map((x) => String(x).toLowerCase())
          );
          list = list.filter(
            (m) => !exclude.has(String(m?.browseBy || '').toLowerCase())
          );
        }

        list = list.slice(0, limit);

        if (cancelled) return;

        setMovies(list);
        setLoaded(true);

        cache.set(key, { movies: list, error: '' });
      } catch (e) {
        if (cancelled) return;

        const msg = e?.message || `Failed to load ${title}`;
        setError(msg);

        cache.set(key, { movies: [], error: msg });

        // don’t spam user for sections they may never scroll to
        if (!lazyLoad || inView) toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    key,
    title,
    browseByValues,
    excludeBrowseByValues,
    limit,
    loaded,
    shouldLoad,
    lazyLoad,
    inView,
  ]);

  // init swiper arrows
  useEffect(() => {
    if (
      swiperRef.current &&
      swiperRef.current.swiper &&
      prevEl.current &&
      nextEl.current
    ) {
      const swiper = swiperRef.current.swiper;
      swiper.params.navigation.prevEl = prevEl.current;
      swiper.params.navigation.nextEl = nextEl.current;
      swiper.navigation.destroy();
      swiper.navigation.init();
      swiper.navigation.update();
    }
  }, [movies.length]);

  const showMoreHref = `/movies?browseBy=${encodeURIComponent(
    browseByValues.join(',')
  )}`;

  // avoid loop warnings: need more than max slidesPerView
  const canLoop = movies.length >= 7;

  // skeleton placeholder while not near viewport
  const showSkeleton = lazyLoad && !inView && !movies.length;

  if (error && !movies.length && !loading) return null;

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
        <p className="text-dryGray text-sm">Loading...</p>
      ) : (
        <>
          {/* MOBILE: 2x2 */}
          <div className="sm:hidden">
            <MobileGridSwiper movies={movies.slice(0, limit)} />
          </div>

          {/* DESKTOP: swiper */}
          <div className="hidden sm:block relative">
            <Swiper
              ref={swiperRef}
              modules={[Navigation, Autoplay]}
              navigation={{ prevEl: prevEl.current, nextEl: nextEl.current }}
              onBeforeInit={(swiper) => {
                swiper.params.navigation.prevEl = prevEl.current;
                swiper.params.navigation.nextEl = nextEl.current;
              }}
              autoplay={{ delay: 3000, disableOnInteraction: false }}
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
              {movies.slice(0, limit).map((m) => (
                <SwiperSlide key={m._id}>
                  <MovieCard movie={m} showLike />
                </SwiperSlide>
              ))}
            </Swiper>

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
          </div>
        </>
      )}
    </section>
  );
}
