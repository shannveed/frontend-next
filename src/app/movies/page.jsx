// frontend-next/src/app/movies/page.jsx
import { redirect } from 'next/navigation';

import MoviesClient from '../../components/movies/MoviesClient';
import { getBrowseByDistinct, getCategories, getMovies } from '../../lib/api';
import {
  buildMoviesQuerySeo,
  getDedicatedListingPath,
} from '../../lib/discoveryPages';

const pick = (sp, key) => {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v || '';
};

export async function generateMetadata({ searchParams }) {
  const query = {
    type: pick(searchParams, 'type'),
    category: pick(searchParams, 'category'),
    browseBy: pick(searchParams, 'browseBy'),
    language: pick(searchParams, 'language'),
    year: pick(searchParams, 'year'),
    time: pick(searchParams, 'time'),
    rate: pick(searchParams, 'rate'),
    search: pick(searchParams, 'search'),
    pageNumber: Number(pick(searchParams, 'pageNumber') || 1) || 1,
  };

  const seo = buildMoviesQuerySeo(query);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: seo.robots,
  };
}

export default async function MoviesPage({ searchParams }) {
  const query = {
    type: pick(searchParams, 'type'),
    category: pick(searchParams, 'category'),
    time: pick(searchParams, 'time'),
    language: pick(searchParams, 'language'),
    rate: pick(searchParams, 'rate'),
    year: pick(searchParams, 'year'),
    browseBy: pick(searchParams, 'browseBy'),
    search: pick(searchParams, 'search'),
    pageNumber: Number(pick(searchParams, 'pageNumber') || 1) || 1,
  };

  // ✅ Redirect simple query URLs to dedicated static SEO routes
  // Examples:
  // /movies?type=Movie => /movies/type/movie
  // /movies?type=Movie&pageNumber=4 => /movies/type/movie/page/4
  // /movies?pageNumber=3 => /movies/page/3
  // /movies?language=English => /language/english
  const dedicatedPath = getDedicatedListingPath(query);
  if (dedicatedPath) redirect(dedicatedPath);

  const [cats, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(query, { revalidate: 60 }).catch(() => ({
      movies: [],
      page: 1,
      pages: 1,
      totalMovies: 0,
    })),
  ]);

  return (
    <MoviesClient
      initialQuery={query}
      initialData={data}
      categories={Array.isArray(cats) ? cats : []}
      browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
    />
  );
}
