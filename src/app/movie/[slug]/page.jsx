// frontend-next/src/app/movie/[slug]/page.jsx
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';

import { getMovieBySlug, getRelatedMovies } from '../../../lib/api';
import {
  buildBreadcrumbJsonLd,
  buildMovieDescription,
  buildMovieJsonLd,
  buildMovieTitle,
  movieCanonical,
} from '../../../lib/seo';

import JsonLd from '../../../components/seo/JsonLd';
import MoviePageClient from '../../../components/movie/MoviePageClient';

const getMovie = cache(async (slug) => getMovieBySlug(slug, { revalidate: 3600 }));

export async function generateMetadata({ params }) {
  const movie = await getMovie(params.slug);

  // ✅ If movie doesn't exist or is not published -> noindex meta for 404 page
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
    openGraph: {
      type: 'video.movie',
      url: canonical,
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
  };
}

export default async function MoviePage({ params }) {
  const movie = await getMovie(params.slug);

  // ✅ REAL 404 status (fixes "Soft 404" + lots of "noindex" URLs)
  if (!movie) notFound();

  // ✅ Strong SEO redirect (308) to canonical slug
  if (movie?.slug && params.slug !== movie.slug) {
    permanentRedirect(`/movie/${movie.slug}`);
  }

  const related = await getRelatedMovies(movie.slug || movie._id, 20, {
    revalidate: 600,
  }).catch(() => []);

  const breadcrumbLd = buildBreadcrumbJsonLd(movie);
  const movieLd = buildMovieJsonLd(movie);

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={movieLd} />

      <MoviePageClient
        slug={params.slug}
        initialMovie={movie}
        initialRelated={Array.isArray(related) ? related : []}
      />
    </>
  );
}
