// frontend-next/src/app/movie/[slug]/page.jsx
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';

import {
  getBannerMovies,
  getLatestNewMovies,
  getMovies,
  getMovieBySlug,
  getRelatedMovies,
  getTopRatedMovies,
} from '../../../lib/api';

import {
  buildMovieDescription,
  buildMovieTitle,
  movieCanonical,
  buildMovieGraphJsonLd,
} from '../../../lib/seo';

import JsonLd from '../../../components/seo/JsonLd';
import MovieInfoServer from '../../../components/movie/MovieInfoServer';
import RelatedMoviesServer from '../../../components/movie/RelatedMoviesServer';

// kept features (client components)
import MovieRatingsStrip from '../../../components/movie/MovieRatingsStrip';
import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../../../components/ads/EffectiveGateNativeBanner';

/**
 * ✅ Long-term SEO settings:
 * - force-static => SSG/ISR HTML (no cookies/headers here!)
 * - revalidate => stable cache (Google gets real HTML instantly)
 */
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 86400; // 24 hours

// Deduplicate fetch between generateMetadata() + page render
const getMovie = cache((slug) => getMovieBySlug(slug, { revalidate }));

/**
 * OPTIONAL: Prebuild a small set of high-traffic movies at build time.
 * Everything else will still work via ISR on first request.
 */
export async function generateStaticParams() {
  try {
    const [banner, latestNew, topRated, page1] = await Promise.all([
      getBannerMovies(10, { revalidate: 60 }).catch(() => []),
      getLatestNewMovies(120, { revalidate: 60 }).catch(() => []),
      getTopRatedMovies({ revalidate: 60 }).catch(() => []),
      getMovies({ pageNumber: 1 }, { revalidate: 60 }).catch(() => ({ movies: [] })),
    ]);

    const all = [
      ...(Array.isArray(banner) ? banner : []),
      ...(Array.isArray(latestNew) ? latestNew : []),
      ...(Array.isArray(topRated) ? topRated : []),
      ...(Array.isArray(page1?.movies) ? page1.movies : []),
    ];

    const set = new Set();
    for (const m of all) {
      const seg = m?.slug || m?._id;
      if (seg) set.add(String(seg));
    }

    // keep build small
    return Array.from(set)
      .slice(0, 200)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const slug = params?.slug;

  const movie = await getMovie(slug);

  if (!movie) {
    return {
      title: 'Movie not found',
      robots: { index: false, follow: false },
    };
  }

  const canonical = movieCanonical(movie);
  const title = buildMovieTitle(movie);
  const description = buildMovieDescription(movie);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: movie?.type === 'WebSeries' ? 'video.tv_show' : 'video.movie',
      url: canonical,
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
  };
}

export default async function MoviePage({ params }) {
  const slug = params?.slug;

  const movie = await getMovie(slug);
  if (!movie) notFound();

  // ✅ canonical slug redirect (308)
  if (movie?.slug && slug !== movie.slug) {
    permanentRedirect(`/movie/${movie.slug}`);
  }

  const seg = movie.slug || movie._id;

  const related = await getRelatedMovies(seg, 20, { revalidate: 3600 }).catch(() => []);

  const graphLd = buildMovieGraphJsonLd(movie);

  const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  return (
    <>
      <JsonLd data={graphLd} />

      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        {/* ✅ Server-rendered SEO content */}
        <MovieInfoServer movie={movie} />

        {/* ✅ Keep existing features */}
        {ADS_ENABLED ? (
          <div className="my-6">
            <EffectiveGateNativeBanner refreshKey={`movie-desktop-before-ratings:${seg}`} />
            <div className="sm:hidden mt-4">
              <EffectiveGateSquareAd refreshKey={`movie-mobile-before-ratings:${seg}`} />
            </div>
          </div>
        ) : null}

        <div className="my-6">
          <MovieRatingsStrip movieIdOrSlug={seg} />
        </div>

        {/* ✅ Server-rendered internal links to related movies */}
        <RelatedMoviesServer currentId={movie._id} movies={related} />

        {ADS_ENABLED ? (
          <div className="my-10">
            <EffectiveGateNativeBanner refreshKey={`movie-desktop-after-related:${seg}`} />
            <div className="sm:hidden mt-4">
              <EffectiveGateSquareAd refreshKey={`movie-mobile-after-related:${seg}`} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
