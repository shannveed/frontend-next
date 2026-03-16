// frontend-next/src/app/movies/page/[page]/page.jsx
import { notFound, redirect } from 'next/navigation';

import MoviesClient from '@/components/movies/MoviesClient';
import { getBrowseByDistinct, getCategories, getMovies } from '@/lib/api';
import { buildAllMoviesPageMeta } from '@/lib/discoveryPages';

export const revalidate = 60;
export const dynamic = 'force-static';
export const dynamicParams = true;

const EMPTY_DATA = {
  movies: [],
  page: 1,
  pages: 1,
  totalMovies: 0,
};

const parsePositiveInt = (value) => {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return NaN;

  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

export async function generateMetadata({ params }) {
  const pageNumber = parsePositiveInt(params?.page);

  if (!Number.isFinite(pageNumber) || pageNumber < 2) {
    return {
      title: 'Movies',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildAllMoviesPageMeta(pageNumber);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function MoviesPaginatedPage({ params }) {
  const pageNumber = parsePositiveInt(params?.page);

  if (!Number.isFinite(pageNumber)) notFound();
  if (pageNumber === 1) redirect('/movies');

  const [cats, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies({ pageNumber }, { revalidate: 60 }).catch(() => EMPTY_DATA),
  ]);

  if (
    !Array.isArray(data?.movies) ||
    data.movies.length === 0 ||
    pageNumber > Number(data?.pages || 1)
  ) {
    notFound();
  }

  return (
    <MoviesClient
      initialQuery={{ pageNumber }}
      initialData={data}
      categories={Array.isArray(cats) ? cats : []}
      browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
    />
  );
}
