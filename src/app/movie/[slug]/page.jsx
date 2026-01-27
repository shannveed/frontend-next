// src/app/movie/[slug]/page.jsx
import { cache } from 'react';
import { redirect } from 'next/navigation';

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

const getMovie = cache(async (slug) =>
  getMovieBySlug(slug, { revalidate: 3600 })
);

export async function generateMetadata({ params }) {
  const movie = await getMovie(params.slug);

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

  // Published movie canonical redirect
  if (movie?.slug && params.slug !== movie.slug) {
    redirect(`/movie/${movie.slug}`);
  }

  const related = movie
    ? await getRelatedMovies(movie.slug || movie._id, 20, { revalidate: 600 }).catch(
        () => []
      )
    : [];

  const breadcrumbLd = movie ? buildBreadcrumbJsonLd(movie) : null;
  const movieLd = movie ? buildMovieJsonLd(movie) : null;

  return (
    <>
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      {movieLd ? <JsonLd data={movieLd} /> : null}

      <MoviePageClient
        slug={params.slug}
        initialMovie={movie}
        initialRelated={Array.isArray(related) ? related : []}
      />
    </>
  );
}
