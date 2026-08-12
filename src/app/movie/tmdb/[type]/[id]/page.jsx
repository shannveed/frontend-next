// frontend-next/src/app/movie/tmdb/[type]/[id]/page.jsx
import { notFound, redirect } from 'next/navigation';

import VirtualMovieDetails from '@/components/movie/VirtualMovieDetails';
import ImportTmdbTitleButton from '@/components/movie/ImportTmdbTitleButton';
import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '@/components/ads/EffectiveGateNativeBanner';
import VisibleBreadcrumbs from '@/components/seo/VisibleBreadcrumbs';

import { SITE_URL, absoluteUrl, clean, truncate } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function getVirtualMovie(type, id) {
  const tmdbType = normalizeType(type);
  const tmdbId = Number(id);

  if (!tmdbType || !Number.isFinite(tmdbId) || tmdbId <= 0) return null;

  const url =
    `${API_BASE}/api/movies/tmdb/virtual/` +
    `${encodeURIComponent(tmdbType)}/` +
    `${encodeURIComponent(tmdbId)}`;

  let res;

  try {
    res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Flixmovo-Frontend': 'tmdb-virtual-page',
      },
    });
  } catch (error) {
    console.error('[tmdb-page] Backend fetch failed:', {
      url,
      error: error?.message || String(error),
    });

    throw new Error(
      `TMDb backend request failed: ${error?.message || 'network error'}`
    );
  }

  const data = await res.json().catch(() => null);

  if (res.status === 404) return null;

  if (!res.ok) {
    console.error('[tmdb-page] Backend returned error:', {
      url,
      status: res.status,
      data,
    });

    throw new Error(
      data?.message ||
      data?.error ||
      `TMDb backend returned HTTP ${res.status}`
    );
  }

  if (!data) {
    throw new Error('TMDb backend returned an empty response');
  }

  return data;
}

export async function generateMetadata({ params }) {
  const movie = await getVirtualMovie(params?.type, params?.id);

  if (!movie) {
    return {
      title: 'TMDb title not found',
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
  const movie = await getVirtualMovie(params?.type, params?.id);

  if (!movie) {
    notFound();
  }

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