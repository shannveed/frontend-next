// src/components/movie/MoviePageClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BsCollectionFill } from 'react-icons/bs';
// Icons removed here as they were only used in the deleted mobile bar

import Loader from '../common/Loader';
import MovieInfoClient from './MovieInfoClient';
import ShareModalClient from './ShareModalClient';
import MovieRatingsStrip from './MovieRatingsStrip';
import MovieCard from './MovieCard';

import { getUserInfo } from '../../lib/client/auth';
import { getFavorites, likeMovie } from '../../lib/client/users';
import { apiFetch } from '../../lib/client/apiFetch';
import { getMovieByIdAdmin, getRelatedMoviesAdmin } from '../../lib/client/moviesAdmin';

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

export default function MoviePageClient({
  slug,
  initialMovie = null,
  initialRelated = [],
}) {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;
  const isAdmin = !!userInfo?.isAdmin;

  const [movie, setMovie] = useState(initialMovie);
  const [related, setRelated] = useState(Array.isArray(initialRelated) ? initialRelated : []);
  const [loading, setLoading] = useState(!initialMovie);
  const [error, setError] = useState('');

  const [shareOpen, setShareOpen] = useState(false);
  // liked state is still kept if you want to pass it to MovieInfoClient later
  const [liked, setLiked] = useState(false);

  // track userInfo from localStorage (CRA login writes to localStorage)
  useEffect(() => {
    setUserInfo(getUserInfo());
    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // If server couldn't fetch the movie (draft or not found), try on client:
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
        setError(e?.message || 'Failed to load movie');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [slug, movie, token, isAdmin]);

  // Keep canonical URL
  useEffect(() => {
    if (!movie?.slug || !slug) return;
    if (movie.slug !== slug) router.replace(`/movie/${movie.slug}`);
  }, [movie?.slug, slug, router]);

  // Fetch related if server didn't provide
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!movie?._id) return;
      if (related?.length) return;

      const rel = await safeGetPublicRelated(movie.slug || movie._id, 20);
      if (!cancelled) setRelated(Array.isArray(rel) ? rel : []);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [movie?._id, movie?.slug, related?.length]);

  // Load favorites
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

  const handleDownload = (url) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleLike = async () => {
    const tokenNow = getUserInfo()?.token;
    if (!tokenNow) {
      toast.error('Please login to add to favorites');
      window.location.href = '/login';
      return;
    }

    try {
      await likeMovie(tokenNow, { movieId: movie._id });
      setLiked(true);
      toast.success('Added to your favorites');
    } catch (e) {
      toast.error(e?.message || 'Failed to add to favorites');
    }
  };

  const relatedToShow = useMemo(() => {
    const list = Array.isArray(related) ? related : [];
    return list.filter((m) => String(m?._id) !== String(movie?._id)).slice(0, 10);
  }, [related, movie?._id]);

  return (
    <>
      <ShareModalClient open={shareOpen} onClose={() => setShareOpen(false)} movie={movie} />

      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        {loading ? (
          <Loader />
        ) : error && !movie ? (
          <div className="flex-colo gap-4 py-12">
            <p className="text-border text-sm">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/movies')}
              className="bg-customPurple px-4 py-2 rounded font-semibold"
            >
              Go to Movies
            </button>
          </div>
        ) : movie ? (
          <>
            <MovieInfoClient
              movie={movie}
              onShare={() => setShareOpen(true)}
              onDownload={handleDownload}
              onBack={() => router.back()}
              // You can pass onLike={handleLike} here if MovieInfoClient needs it
            />

            <div className="my-6">
              <MovieRatingsStrip movieIdOrSlug={movie?.slug || movie?._id} />
            </div>

            {relatedToShow.length > 0 && (
              <div className="my-16">
                <div className="flex items-center gap-2 mb-6">
                  <BsCollectionFill className="text-white" />
                  <h3 className="text-white font-semibold">Related Movies</h3>
                </div>

                <div className="grid sm:mt-6 mt-4 xl:grid-cols-5 2xl:grid-cols-5 lg:grid-cols-3 sm:grid-cols-2 mobile:grid-cols-2 grid-cols-1 gap-4 mobile:gap-3">
                  {relatedToShow.map((m) => (
                    <MovieCard key={m._id} movie={m} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
      
      {/* Mobile Quick Actions block has been removed */}
    </>
  );
}