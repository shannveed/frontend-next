// frontend-next/src/app/watch/tmdb/[type]/[id]/page.jsx
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import VirtualWatchClient from '@/components/watch/VirtualWatchClient';

import { SITE_URL, clean, truncate } from '@/lib/seo';

export const revalidate = 300;

const normalizeApiBase = (raw = '') => {
  let value = String(raw || 'https://api.flixmovo.online').trim();

  if (!/^https?:\/\//i.test(value)) {
    const isLocal =
      value.startsWith('localhost') ||
      value.startsWith('127.0.0.1') ||
      value.startsWith('0.0.0.0');

    value = `${isLocal ? 'http' : 'https'}://${value.replace(/^\/+/, '')}`;
  }

  return value.replace(/\/+$/, '').replace(/\/api$/i, '');
};

const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.flixmovo.online'
);

const normalizeType = (value = '') => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'movie') return 'movie';
  if (raw === 'tv') return 'tv';
  return '';
};

const loadVirtualMovie = async (type, id) => {
  const tmdbType = normalizeType(type);
  const tmdbId = Number(id);

  if (!tmdbType || !Number.isFinite(tmdbId) || tmdbId <= 0) {
    return null;
  }

  const url = `${API_BASE}/api/movies/tmdb/virtual/${encodeURIComponent(
    tmdbType
  )}/${encodeURIComponent(tmdbId)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Flixmovo-Frontend/1.0',
    },
    next: { revalidate: 300 },
  });

  const data = await res.json().catch(() => null);

  // Only a real backend 404 means the title does not exist.
  if (res.status === 404) return null;

  // Do not disguise infrastructure and rate-limit failures as 404 pages.
  if (!res.ok) {
    const error = new Error(
      data?.message || `TMDB virtual API failed with HTTP ${res.status}`
    );
    error.status = res.status;
    throw error;
  }

  if (!data || !data.name) {
    throw new Error('TMDB virtual API returned an invalid response');
  }

  return data;
};

const getVirtualMovie = cache(loadVirtualMovie);

export async function generateMetadata({ params }) {
  let movie;

  try {
    movie = await getVirtualMovie(params?.type, params?.id);
  } catch (error) {
    console.error('[tmdb-movie-metadata] fetch failed', {
      type: params?.type,
      id: params?.id,
      status: error?.status || 0,
      message: error?.message || String(error),
    });

    return {
      title: 'TMDB title temporarily unavailable',
      robots: { index: false, follow: false },
    };
  }

  if (!movie) {
    return {
      title: 'TMDB title not found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${SITE_URL}/watch/tmdb/${normalizeType(params?.type)}/${params?.id}`;

  const title = `Watch ${clean(movie?.name || 'Movie')}${movie?.year ? ` (${movie.year})` : ''
    } | Flixmovo`;

  const description = truncate(
    movie?.desc || `Watch ${movie?.name || 'this title'} on Flixmovo.`,
    160
  );

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default async function TmdbWatchPage({ params }) {
  const movie = await getVirtualMovie(params?.type, params?.id).catch(() => null);

  if (!movie) notFound();

  if (movie?.source === 'local' && movie?.slug) {
    redirect(`/watch/${movie.slug}`);
  }

  return <VirtualWatchClient movie={movie} />;
}
