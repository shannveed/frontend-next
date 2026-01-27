// src/components/movie/MovieRatingsStrip.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import Loader from '../common/Loader';
import { getMovieRatings } from '../../lib/client/ratings';

const StarsSmall = ({ value = 0 }) => {
  const v = Number(value) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FaStar
          key={i}
          className={`${i <= v ? 'text-star' : 'text-border'} text-xs`}
        />
      ))}
    </div>
  );
};

export default function MovieRatingsStrip({ movieIdOrSlug, limit = 20 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState([]);
  const [aggregate, setAggregate] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!movieIdOrSlug) return;

      try {
        setLoading(true);
        setError('');

        const data = await getMovieRatings(movieIdOrSlug, limit, 1);

        if (cancelled) return;

        setRatings(Array.isArray(data?.ratings) ? data.ratings : []);
        setAggregate(
          data?.aggregate && typeof data.aggregate === 'object'
            ? data.aggregate
            : { avg: 0, count: 0 }
        );
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load ratings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [movieIdOrSlug, limit]);

  const cards = useMemo(() => (ratings || []).slice(0, limit), [ratings, limit]);

  const avg = Number(aggregate?.avg) || 0;
  const count = Number(aggregate?.count) || 0;

  if (!movieIdOrSlug) return null;

  return (
    <section className="bg-dry border border-border rounded-lg p-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-white font-semibold text-sm">User Ratings</h3>

        <div className="flex items-center gap-2 text-xs">
          <StarsSmall value={Math.round(avg)} />
          <span className="text-white font-semibold">{avg.toFixed(1)}</span>
          <span className="text-dryGray">({count})</span>
        </div>
      </header>

      {loading ? (
        <div className="mt-4">
          <Loader />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      ) : count === 0 ? (
        <p className="mt-3 text-sm text-dryGray">
          No ratings yet. Watch and be the first to rate.
        </p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {cards.map((r) => {
            const name = r?.user?.fullName || 'User';
            const avatar = r?.user?.image || '/images/placeholder.jpg';
            const comment = String(r?.comment || '').trim();
            const ratingVal = Number(r?.rating) || 0;
            const dateStr = r?.createdAt
              ? new Date(r.createdAt).toLocaleDateString()
              : '';

            return (
              <div
                key={r._id}
                className="min-w-[260px] max-w-[260px] bg-main border border-border rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-8 h-8 rounded-full border border-border object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/placeholder.jpg';
                    }}
                  />

                  <div className="min-w-0">
                    <p className="text-xs text-white font-semibold truncate">{name}</p>

                    <div className="flex items-center gap-2">
                      <StarsSmall value={Math.round(ratingVal)} />
                      {dateStr ? (
                        <span className="text-[11px] text-dryGray">{dateStr}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {comment ? (
                  <p className="text-xs text-dryGray leading-5 line-clamp-3">{comment}</p>
                ) : (
                  <p className="text-xs text-dryGray italic">Rated {ratingVal}/5</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
