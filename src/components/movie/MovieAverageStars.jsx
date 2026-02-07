// frontend-next/src/components/movie/MovieAverageStars.jsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Stars from './Stars';
import { getMovieRatings } from '../../lib/client/ratings';

const RATINGS_UPDATED_EVENT = 'mf-ratings-updated';

/**
 * Displays LIVE average rating stars for a movie/web-series.
 * Source of truth: GET /api/movies/:id/ratings -> aggregate.avg
 */
export default function MovieAverageStars({
  movieIdOrSlug,
  fallback = 0,
  className = '',
}) {
  const [avg, setAvg] = useState(() => Number(fallback) || 0);

  // Reset fallback when switching movies
  useEffect(() => {
    setAvg(Number(fallback) || 0);
  }, [movieIdOrSlug, fallback]);

  const fetchAvg = useCallback(async () => {
    const key = String(movieIdOrSlug || '').trim();
    if (!key) return;

    try {
      const data = await getMovieRatings(key, 1, 1);
      const nextAvg = Number(data?.aggregate?.avg);
      if (Number.isFinite(nextAvg)) setAvg(nextAvg);
    } catch {
      // keep fallback
    }
  }, [movieIdOrSlug]);

  // initial fetch
  useEffect(() => {
    fetchAvg();
  }, [fetchAvg]);

  // refresh on event (admin delete etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = String(movieIdOrSlug || '').trim();
    if (!key) return;

    const handler = (evt) => {
      const detail = String(evt?.detail || '').trim();
      // if event includes detail, only refresh matching movie
      if (detail && detail !== key) return;
      fetchAvg();
    };

    window.addEventListener(RATINGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(RATINGS_UPDATED_EVENT, handler);
  }, [movieIdOrSlug, fetchAvg]);

  return <Stars value={avg} className={className} />;
}
