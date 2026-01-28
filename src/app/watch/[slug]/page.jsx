// src/app/watch/[slug]/page.jsx
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';

import { getMovieBySlug, getRelatedMovies } from '../../../lib/api';
import {
  buildMovieDescription,
  buildMovieTitle,
  watchCanonical,
} from '../../../lib/seo';

import WatchClient from '../../../components/watch/WatchClient';

const getMovie = cache((slug) => getMovieBySlug(slug, { revalidate: 3600 }));

export async function generateMetadata({ params }) {
  const movie = await getMovie(params.slug);

  if (!movie) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }

  const title = `Watch: ${buildMovieTitle(movie)}`;
  const description = buildMovieDescription(movie);
  const canonical = watchCanonical(movie);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: movie?.type === 'WebSeries' ? 'video.episode' : 'video.movie',
      url: canonical,
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
  };
}

export default async function WatchPage({ params }) {
  const movie = await getMovie(params.slug);

  if (!movie) notFound();

  if (movie?.slug && params.slug !== movie.slug) {
    permanentRedirect(`/watch/${movie.slug}`);
  }

  const related = await getRelatedMovies(movie.slug || movie._id, 20, {
    revalidate: 600,
  }).catch(() => []);

  return (
    <WatchClient
      slug={params.slug}
      initialMovie={movie}
      initialRelated={Array.isArray(related) ? related : []}
    />
  );
}
