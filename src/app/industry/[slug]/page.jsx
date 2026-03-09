// frontend-next/src/app/industry/[slug]/page.jsx
import { notFound, permanentRedirect } from 'next/navigation';

import MoviesClient from '../../../components/movies/MoviesClient';
import SeoLandingHero from '../../../components/movies/SeoLandingHero';

import { getBrowseByDistinct, getCategories, getMovies } from '../../../lib/api';
import {
  INDUSTRY_PAGES,
  buildIndustryPageMeta,
  getIndustryBySlug,
} from '../../../lib/discoveryPages';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return INDUSTRY_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const industry = getIndustryBySlug(params.slug);

  if (!industry) {
    return {
      title: 'Industry not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildIndustryPageMeta(industry);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function IndustryPage({ params }) {
  const industry = getIndustryBySlug(params.slug);
  if (!industry) notFound();

  // ✅ Alias support:
  // /industry/bollywood-hindi -> /industry/bollywood
  if (params.slug !== industry.slug) {
    permanentRedirect(`/industry/${industry.slug}`);
  }

  const [categories, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(
      {
        browseBy: industry.browseByValues.join(','),
        pageNumber: 1,
      },
      { revalidate: 300 }
    ).catch(() => ({ movies: [], page: 1, pages: 1, totalMovies: 0 })),
  ]);

  if (!Array.isArray(data?.movies) || data.movies.length === 0) {
    notFound();
  }

  const meta = buildIndustryPageMeta(industry);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Industry Collection"
        title={meta.heading}
        description={meta.body}
        chips={[
          ...industry.browseByValues.slice(0, 2),
          `${total} titles`,
        ]}
      />

      <MoviesClient
        initialQuery={{
          browseBy: industry.browseByValues.join(','),
          pageNumber: 1,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
