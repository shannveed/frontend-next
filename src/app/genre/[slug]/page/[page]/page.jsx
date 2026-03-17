// frontend-next/src/app/genre/[slug]/page/[page]/page.jsx
import { notFound, redirect } from 'next/navigation';

import MoviesClient from '@/components/movies/MoviesClient';
import SeoLandingHero from '@/components/movies/SeoLandingHero';

import {
  getBrowseByDistinct,
  getCategories,
  getMovies,
  hasListingPageContent,
} from '@/lib/api';
import { resolveListingPageForRequest } from '@/lib/server/adminListingPreview';
import {
  buildGenrePageMeta,
  buildGenrePagePath,
  slugifySegment,
} from '@/lib/discoveryPages';

export const revalidate = 3600;

// IMPORTANT:
// Keep paginated SEO listing pages refreshable after content mutations.
// We also support SSR admin fallback so draft-only last pages can be previewed by admins.
export const dynamic = 'auto';
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

const pickCategoryBySlug = (categories = [], slug = '') => {
  const target = String(slug || '').trim().toLowerCase();
  return (
    categories.find((cat) => slugifySegment(cat?.title) === target) || null
  );
};

export async function generateMetadata({ params }) {
  const pageNumber = parsePositiveInt(params?.page);
  const categories = await getCategories({ revalidate: 3600 }).catch(() => []);
  const category = pickCategoryBySlug(categories, params?.slug);

  if (!category || !Number.isFinite(pageNumber) || pageNumber < 2) {
    return {
      title: 'Genre not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildGenrePageMeta(category.title, pageNumber);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function GenrePaginatedPage({ params }) {
  const pageNumber = parsePositiveInt(params?.page);
  if (!Number.isFinite(pageNumber)) notFound();

  const [categories, browseByDistinct] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
  ]);

  const category = pickCategoryBySlug(categories, params?.slug);
  if (!category) notFound();
  if (pageNumber === 1) redirect(buildGenrePagePath(category.title));

  const publicData = await getMovies(
    {
      category: category.title,
      pageNumber,
    },
    { revalidate: 300 }
  ).catch(() => EMPTY_DATA);

  const { data } = await resolveListingPageForRequest(publicData, {
    category: category.title,
    pageNumber,
  });

  if (!hasListingPageContent(data, pageNumber)) {
    notFound();
  }

  const meta = buildGenrePageMeta(category.title, pageNumber);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Genre Collection"
        title={meta.heading}
        description={meta.body}
        chips={[category.title, `${total} titles`, `Page ${pageNumber}`]}
      />

      <MoviesClient
        initialQuery={{
          category: category.title,
          pageNumber,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
