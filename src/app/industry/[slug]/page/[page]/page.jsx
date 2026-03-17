// frontend-next/src/app/industry/[slug]/page/[page]/page.jsx
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
  buildIndustryPageMeta,
  buildIndustryPagePath,
  getIndustryBySlug,
} from '@/lib/discoveryPages';

export const revalidate = 3600;

// IMPORTANT:
// Keep paginated SEO listing pages refreshable after bulk-create / publish changes.
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

export async function generateMetadata({ params }) {
  const industry = getIndustryBySlug(params?.slug);
  const pageNumber = parsePositiveInt(params?.page);

  if (!industry || !Number.isFinite(pageNumber) || pageNumber < 2) {
    return {
      title: 'Industry not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildIndustryPageMeta(industry, pageNumber);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function IndustryPaginatedPage({ params }) {
  const industry = getIndustryBySlug(params?.slug);
  if (!industry) notFound();

  const pageNumber = parsePositiveInt(params?.page);
  if (!Number.isFinite(pageNumber)) notFound();
  if (pageNumber === 1) redirect(buildIndustryPagePath(industry));

  const [categories, browseByDistinct, publicData] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(
      {
        browseBy: industry.browseByValues.join(','),
        pageNumber,
      },
      { revalidate: 300 }
    ).catch(() => EMPTY_DATA),
  ]);

  const { data } = await resolveListingPageForRequest(publicData, {
    browseBy: industry.browseByValues.join(','),
    pageNumber,
  });

  if (!hasListingPageContent(data, pageNumber)) {
    notFound();
  }

  const meta = buildIndustryPageMeta(industry, pageNumber);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Industry Collection"
        title={meta.heading}
        description={meta.body}
        chips={[...industry.browseByValues.slice(0, 2), `${total} titles`, `Page ${pageNumber}`]}
      />

      <MoviesClient
        initialQuery={{
          browseBy: industry.browseByValues.join(','),
          pageNumber,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
