'use client';

import React, { useEffect, useState } from 'react';
import Stars from './Stars';
import { getMovieRatings } from '../../lib/client/ratings';

/**
 * Displays LIVE average rating stars for a movie/web-series.
 * Source of truth: GET /api/movies/:id/ratings -> aggregate.avg
 *
 * This avoids stale ISR cached `movie.rate` values on /movie pages.
 */
export default function MovieAverageStars({
  movieIdOrSlug,
  fallback = 0, // use server value until live fetch returns
  className = '',
}) {
  const [avg, setAvg] = useState(() => Number(fallback) || 0);

  // Reset fallback when switching movies
  useEffect(() => {
    setAvg(Number(fallback) || 0);
  }, [movieIdOrSlug, fallback]);

  // Fetch live average
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const key = String(movieIdOrSlug || '').trim();
      if (!key) return;

      try {
        // limit=1 keeps payload small; we only need aggregate
        const data = await getMovieRatings(key, 1, 1);

        if (cancelled) return;

        const nextAvg = Number(data?.aggregate?.avg);
        if (Number.isFinite(nextAvg)) setAvg(nextAvg);
      } catch {
        // ignore: keep fallback
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [movieIdOrSlug]);

  return <Stars value={avg} className={className} />;
}
