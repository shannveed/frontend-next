// frontend-next/src/app/movies/type/[type]/page/[page]/page.jsx
import { notFound, redirect } from 'next/navigation';

import MoviesClient from '@/components/movies/MoviesClient';
import SeoLandingHero from '@/components/movies/SeoLandingHero';

import { getBrowseByDistinct, getCategories, getMovies } from '@/lib/api';
import {
  buildTypePageMeta,
  buildTypePagePath,
  getTypePageBySlug,
} from '@/lib/discoveryPages';

export const revalidate = 3600;
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
  const typePage = getTypePageBySlug(params?.type);
  const pageNumber = parsePositiveInt(params?.page);

  if (!typePage || !Number.isFinite(pageNumber) || pageNumber < 2) {
    return {
      title: 'Page not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildTypePageMeta(typePage, pageNumber);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function MoviesTypePaginatedPage({ params }) {
  const typePage = getTypePageBySlug(params?.type);
  if (!typePage) notFound();

  const pageNumber = parsePositiveInt(params?.page);
  if (!Number.isFinite(pageNumber)) notFound();
  if (pageNumber === 1) redirect(buildTypePagePath(typePage));

  const [categories, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(
      {
        type: typePage.type,
        pageNumber,
      },
      { revalidate: 300 }
    ).catch(() => EMPTY_DATA),
  ]);

  if (
    !Array.isArray(data?.movies) ||
    data.movies.length === 0 ||
    pageNumber > Number(data?.pages || 1)
  ) {
    notFound();
  }

  const meta = buildTypePageMeta(typePage, pageNumber);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Type Collection"
        title={meta.heading}
        description={meta.body}
        chips={[typePage.label, `${total} titles`, `Page ${pageNumber}`]}
      />

      <MoviesClient
        initialQuery={{
          type: typePage.type,
          pageNumber,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
