// frontend-next/src/app/movie/tmdb/[type]/[id]/page.jsx
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import VirtualMovieDetails from '@/components/movie/VirtualMovieDetails';
import ImportTmdbTitleButton from '@/components/movie/ImportTmdbTitleButton';
import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '@/components/ads/EffectiveGateNativeBanner';
import VisibleBreadcrumbs from '@/components/seo/VisibleBreadcrumbs';

import { SITE_URL, absoluteUrl, clean, truncate } from '@/lib/seo';

export const revalidate = 300;

const normalizeApiBase = (raw = '') => {
  let value = String(raw || 'https://api.flixmovo.online').trim();

  if (!/^https?:\/\//i.test(value)) {
    const isLocal =a
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

  if (movie?.source === 'local' && movie?.slug) {
    return {
      title: movie.name || 'Flixmovo',
      robots: { index: false, follow: true },
    };
  }

  const canonical = `${SITE_URL}/movie/tmdb/${normalizeType(
    params?.type
  )}/${params?.id}`;

  const title = `${clean(movie?.name || 'Movie')}${movie?.year ? ` (${movie.year})` : ''
    } | Flixmovo`;

  const description = truncate(
    movie?.seoDescription ||
    movie?.desc ||
    `Watch ${movie?.name || 'this title'} on Flixmovo.`,
    160
  );

  const image = absoluteUrl(
    movie?.titleImage || movie?.image || '/images/FLIXMOVO.png'
  );

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },

    // Keep virtual infinite pages crawl-safe. Actor pages can still index/follow cards.
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },

    openGraph: {
      type: movie?.type === 'WebSeries' ? 'video.tv_show' : 'video.movie',
      url: canonical,
      title,
      description,
      images: image ? [image] : [],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function TmdbMoviePage({ params }) {
  const movie = await getVirtualMovie(params?.type, params?.id).catch(
    () => null
  );

  if (!movie) notFound();

  if (movie?.source === 'local' && movie?.slug) {
    redirect(`/movie/${movie.slug}`);
  }

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Movies', href: '/movies' },
          { label: movie?.name || 'TMDb Title' },
        ]}
        className="mb-4"
      />

      <ImportTmdbTitleButton
        tmdbType={movie?.tmdbType || params?.type}
        tmdbId={movie?.tmdbId || params?.id}
        movieName={movie?.name || ''}
      />

      <VirtualMovieDetails movie={movie} />

      <div className="mt-8">
        <EffectiveGateNativeBanner
          refreshKey={`tmdb-movie-desktop-${movie?.tmdbType}-${movie?.tmdbId}`}
        />

        <div className="sm:hidden mt-4">
          <EffectiveGateSquareAd
            refreshKey={`tmdb-movie-mobile-${movie?.tmdbType}-${movie?.tmdbId}`}
          />
        </div>
      </div>
    </div>
  );
}
