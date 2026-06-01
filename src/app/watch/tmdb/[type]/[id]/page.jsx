// frontend-next/src/app/watch/tmdb/[type]/[id]/page.jsx
import { notFound, redirect } from 'next/navigation';

import VirtualWatchClient from '@/components/watch/VirtualWatchClient';

import { SITE_URL, clean, truncate } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const normalizeApiBase = (raw = '') => {
  let value = String(raw || 'https://moviefrost-backend-omega.vercel.app').trim();

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
  'https://moviefrost-backend-omega.vercel.app'
);

const normalizeType = (value = '') => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'movie') return 'movie';
  if (raw === 'tv') return 'tv';
  return '';
};

async function getVirtualMovie(type, id) {
  const tmdbType = normalizeType(type);
  const tmdbId = Number(id);

  if (!tmdbType || !Number.isFinite(tmdbId) || tmdbId <= 0) return null;

  const res = await fetch(
    `${API_BASE}/api/movies/tmdb/virtual/${encodeURIComponent(tmdbType)}/${encodeURIComponent(tmdbId)}`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }
  );

  if (res.status === 404) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || 'Failed to load TMDb title');
  }

  return data;
}

export async function generateMetadata({ params }) {
  const movie = await getVirtualMovie(params?.type, params?.id).catch(() => null);

  if (!movie) {
    return {
      title: 'TMDb title not found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${SITE_URL}/watch/tmdb/${normalizeType(params?.type)}/${params?.id}`;

  const title = `Watch ${clean(movie?.name || 'Movie')}${movie?.year ? ` (${movie.year})` : ''
    } | MovieFrost`;

  const description = truncate(
    movie?.desc || `Watch ${movie?.name || 'this title'} on MovieFrost.`,
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
