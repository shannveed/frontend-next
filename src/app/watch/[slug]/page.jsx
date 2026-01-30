// frontend-next/src/app/watch/[slug]/page.jsx
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import {
  getMovieBySlug,
  getMovieBySlugAdmin, // ✅ NEW
  getRelatedMovies,
  getRelatedMoviesAdmin, // ✅ NEW (optional)
} from "../../../lib/api";

import { buildMovieDescription, buildMovieTitle, watchCanonical } from "../../../lib/seo";
import WatchClient from "../../../components/watch/WatchClient";

// Public fetch is cacheable
const getPublicMovie = cache((slug) => getMovieBySlug(slug, { revalidate: 3600 }));

async function getMovieForRequest(slug) {
  const pub = await getPublicMovie(slug);
  if (pub) return { movie: pub, source: "public", token: null };

  const token = cookies().get("mf_token")?.value || null;
  if (!token) return { movie: null, source: "none", token: null };

  const adminMovie = await getMovieBySlugAdmin(slug, token);
  if (adminMovie) return { movie: adminMovie, source: "admin", token };

  return { movie: null, source: "none", token: null };
}

export async function generateMetadata({ params }) {
  const { movie } = await getMovieForRequest(params.slug);

  if (!movie) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const title = `Watch: ${buildMovieTitle(movie)}`;
  const description = buildMovieDescription(movie);
  const canonical = watchCanonical(movie);

  const isPublished = movie?.isPublished !== false;

  return {
    title,
    description,
    alternates: { canonical },
    robots: isPublished ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: movie?.type === "WebSeries" ? "video.episode" : "video.movie",
      url: canonical,
      title,
      description,
      images: [movie?.titleImage || movie?.image].filter(Boolean),
    },
  };
}

export default async function WatchPage({ params }) {
  const { movie, source, token } = await getMovieForRequest(params.slug);

  if (!movie) notFound();

  if (movie?.slug && params.slug !== movie.slug) {
    permanentRedirect(`/watch/${movie.slug}`);
  }

  let related = [];
  if (source === "admin" && token) {
    related = await getRelatedMoviesAdmin(movie.slug || movie._id, token, 20).catch(() => []);
  } else {
    related = await getRelatedMovies(movie.slug || movie._id, 20, {
      revalidate: 600,
    }).catch(() => []);
  }

  return (
    <WatchClient
      slug={params.slug}
      initialMovie={movie}
      initialRelated={Array.isArray(related) ? related : []}
    />
  );
}
