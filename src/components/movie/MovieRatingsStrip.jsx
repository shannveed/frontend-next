// frontend-next/src/components/movie/MovieRatingsStrip.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

import { getUserInfo } from '../../lib/client/auth';
import {
  getMovieRatings,
  deleteMovieRatingAdmin,
} from '../../lib/client/ratings';

const RATINGS_UPDATED_EVENT = 'mf-ratings-updated';
const SECTION_MIN_HEIGHT_CLASS = 'min-h-[176px] sm:min-h-[188px]';

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

function RatingCardSkeleton({ index }) {
  return (
    <div
      key={`rating-skeleton-${index}`}
      className="min-w-[260px] max-w-[260px] bg-main border border-border rounded-lg p-3 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-dry" />
        <div className="flex-1 min-w-0">
          <div className="h-3 w-24 bg-dry rounded" />
          <div className="mt-2 h-2.5 w-16 bg-dry rounded" />
        </div>
      </div>

      <div className="h-2.5 w-full bg-dry rounded mb-2" />
      <div className="h-2.5 w-5/6 bg-dry rounded mb-2" />
      <div className="h-2.5 w-2/3 bg-dry rounded" />
    </div>
  );
}

export default function MovieRatingsStrip({ movieIdOrSlug, limit = 20 }) {
  const [userInfo, setUserInfo] = useState(null);

  const token = userInfo?.token || null;
  const isAdmin = !!(userInfo?.isAdmin && token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState([]);
  const [aggregate, setAggregate] = useState({ avg: 0, count: 0 });

  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setUserInfo(getUserInfo());
    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setRatings([]);
    setAggregate({ avg: 0, count: 0 });
    setDeletingId(null);
  }, [movieIdOrSlug]);

  const load = useCallback(async () => {
    if (!movieIdOrSlug) return;

    try {
      setLoading(true);
      setError('');

      const data = await getMovieRatings(movieIdOrSlug, limit, 1);

      setRatings(Array.isArray(data?.ratings) ? data.ratings : []);
      setAggregate(
        data?.aggregate && typeof data.aggregate === 'object'
          ? data.aggregate
          : { avg: 0, count: 0 }
      );
    } catch (e) {
      setError(e?.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [movieIdOrSlug, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(() => (ratings || []).slice(0, limit), [ratings, limit]);

  const avg = Number(aggregate?.avg) || 0;
  const count = Number(aggregate?.count) || 0;
  const skeletonCount = Math.max(2, Math.min(limit, 3));

  const doDelete = async (ratingId) => {
    if (!isAdmin) return;

    const ok = window.confirm('Delete this rating/review?');
    if (!ok) return;

    try {
      setDeletingId(ratingId);

      await deleteMovieRatingAdmin(token, movieIdOrSlug, ratingId);

      toast.success('Rating removed');

      await load();

      try {
        window.dispatchEvent(
          new CustomEvent(RATINGS_UPDATED_EVENT, {
            detail: String(movieIdOrSlug),
          })
        );
      } catch {
        // ignore
      }
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (!movieIdOrSlug) return null;

  return (
    <section
      className={`bg-dry border border-border rounded-lg p-4 ${SECTION_MIN_HEIGHT_CLASS}`}
    >
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-white font-semibold text-sm">User Ratings</h3>

        <div className="flex items-center gap-2 text-xs">
          <StarsSmall value={Math.round(avg)} />
          <span className="text-white font-semibold">{avg.toFixed(1)}</span>
          <span className="text-dryGray">({count})</span>
        </div>
      </header>

      <div className="mt-4">
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: skeletonCount }).map((_, idx) => (
              <RatingCardSkeleton key={idx} index={idx} />
            ))}
          </div>
        ) : error ? (
          <div className="min-h-[116px] flex items-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : count === 0 || !cards.length ? (
          <div className="min-h-[116px] flex items-center">
            <p className="text-sm text-dryGray">
              No ratings yet. Watch and be the first to rate.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
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
                  className="relative min-w-[260px] max-w-[260px] bg-main border border-border rounded-lg p-3"
                >
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => doDelete(r._id)}
                      disabled={deletingId === r._id}
                      className="absolute top-2 right-2 w-8 h-8 flex-colo rounded bg-black/40 hover:bg-red-600/80 border border-border text-white disabled:opacity-60"
                      title="Delete rating"
                      aria-label="Delete rating"
                    >
                      {deletingId === r._id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MdDelete className="text-lg" />
                      )}
                    </button>
                  ) : null}

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
                      <p className="text-xs text-white font-semibold truncate">
                        {name}
                      </p>

                      <div className="flex items-center gap-2">
                        <StarsSmall value={Math.round(ratingVal)} />
                        {dateStr ? (
                          <span className="text-[11px] text-dryGray">{dateStr}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {comment ? (
                    <p className="text-xs text-dryGray leading-5 line-clamp-3">
                      {comment}
                    </p>
                  ) : (
                    <p className="text-xs text-dryGray italic">
                      Rated {ratingVal}/5
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
