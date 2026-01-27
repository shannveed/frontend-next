import MoviesClient from '../../components/movies/MoviesClient';
import { getBrowseByDistinct, getCategories, getMovies } from '../../lib/api';
import { SITE_URL } from '../../lib/seo';

const pick = (sp, key) => {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v || '';
};

export async function generateMetadata({ searchParams }) {
  const category = pick(searchParams, 'category');
  const browseBy = pick(searchParams, 'browseBy');
  const search = pick(searchParams, 'search');
  const pageNumber = Number(pick(searchParams, 'pageNumber') || 1) || 1;

  const canonicalUrl = new URL(`${SITE_URL}/movies`);
  if (category) canonicalUrl.searchParams.set('category', category);
  if (browseBy) canonicalUrl.searchParams.set('browseBy', browseBy);
  if (search) canonicalUrl.searchParams.set('search', search);
  if (pageNumber > 1) canonicalUrl.searchParams.set('pageNumber', String(pageNumber));

  const part = search ? `Search: ${search}` : category ? category : browseBy ? browseBy : 'Movies';

  return {
    title: `${part} (Page ${pageNumber})`,
    description: `Browse ${part} on MovieFrost. Page ${pageNumber}.`,
    alternates: { canonical: canonicalUrl.toString() },
  };
}

export default async function MoviesPage({ searchParams }) {
  const query = {
    category: pick(searchParams, 'category'),
    time: pick(searchParams, 'time'),
    language: pick(searchParams, 'language'),
    rate: pick(searchParams, 'rate'),
    year: pick(searchParams, 'year'),
    browseBy: pick(searchParams, 'browseBy'),
    search: pick(searchParams, 'search'),
    pageNumber: Number(pick(searchParams, 'pageNumber') || 1) || 1,
  };

  const [cats, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(query, { revalidate: 60 }).catch(() => ({ movies: [], page: 1, pages: 1, totalMovies: 0 })),
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
