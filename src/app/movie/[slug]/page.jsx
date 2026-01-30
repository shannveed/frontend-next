// frontend-next/src/app/movie/[slug]/page.jsx
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import {
  getMovieBySlug,
  getMovieBySlugAdmin, // ✅ NEW
  getRelatedMovies,
  getRelatedMoviesAdmin, // ✅ NEW (optional)
} from "../../../lib/api";

import {
  buildMovieDescription,
  buildMovieTitle,
  movieCanonical,
  buildMovieGraphJsonLd,
} from "../../../lib/seo";

import JsonLd from "../../../components/seo/JsonLd";
import MoviePageClient from "../../../components/movie/MoviePageClient";

// Public fetch is cacheable
const getPublicMovie = cache((slug) => getMovieBySlug(slug, { revalidate: 300 }));

async function getMovieForRequest(slug) {
  // 1) Public first (SEO + caching)
  const pub = await getPublicMovie(slug);
  if (pub) return { movie: pub, source: "public", token: null };

  // 2) If not found publicly → try admin using SSR cookie token
  const token = cookies().get("mf_token")?.value || null;
  if (!token) return { movie: null, source: "none", token: null };

  const adminMovie = await getMovieBySlugAdmin(slug, token);
  if (adminMovie) return { movie: adminMovie, source: "admin", token };

  return { movie: null, source: "none", token: null };
}

export async function generateMetadata({ params }) {
  const { movie } = await getMovieForRequest(params.slug);

  if (!movie) {
    return {
      title: "Movie not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = movieCanonical(movie);
  const title = buildMovieTitle(movie);
  const description = buildMovieDescription(movie);

  const isPublished = movie?.isPublished !== false;

  return {
    title,
    description,
    alternates: { canonical },
    robots: isPublished ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "video.movie",
      url: canonical,
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
  };
}

export default async function MoviePage({ params }) {
  const { movie, source, token } = await getMovieForRequest(params.slug);

  if (!movie) notFound();

  // ✅ 308 redirect to canonical slug
  if (movie?.slug && params.slug !== movie.slug) {
    permanentRedirect(`/movie/${movie.slug}`);
  }

  // Related: public for public pages, admin for draft previews (optional)
  let related = [];
  if (source === "admin" && token) {
    related = await getRelatedMoviesAdmin(movie.slug || movie._id, token, 20).catch(() => []);
  } else {
    related = await getRelatedMovies(movie.slug || movie._id, 20, {
      revalidate: 600,
    }).catch(() => []);
  }

  const graphLd = buildMovieGraphJsonLd(movie);

  return (
    <>
      <JsonLd data={graphLd} />
      <MoviePageClient
        slug={params.slug}
        initialMovie={movie}
        initialRelated={Array.isArray(related) ? related : []}
      />
    </>
  );
}
