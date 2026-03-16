// frontend-next/src/app/language/[slug]/page/[page]/page.jsx
import { notFound, redirect } from 'next/navigation';

import MoviesClient from '@/components/movies/MoviesClient';
import SeoLandingHero from '@/components/movies/SeoLandingHero';

import { getBrowseByDistinct, getCategories, getMovies } from '@/lib/api';
import {
  buildLanguagePageMeta,
  buildLanguagePagePath,
  slugifySegment,
} from '@/lib/discoveryPages';
import { LanguageData } from '@/data/filterData';

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

const SUPPORTED_LANGUAGES = LanguageData.map((item) =>
  String(item?.title || '').trim()
).filter((title) => title && !/^sort by/i.test(title));

const pickLanguageBySlug = (slug = '') => {
  const target = String(slug || '').trim().toLowerCase();
  return (
    SUPPORTED_LANGUAGES.find((language) => slugifySegment(language) === target) ||
    null
  );
};

export async function generateMetadata({ params }) {
  const language = pickLanguageBySlug(params?.slug);
  const pageNumber = parsePositiveInt(params?.page);

  if (!language || !Number.isFinite(pageNumber) || pageNumber < 2) {
    return {
      title: 'Language not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildLanguagePageMeta(language, pageNumber);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function LanguagePaginatedPage({ params }) {
  const language = pickLanguageBySlug(params?.slug);
  if (!language) notFound();

  const pageNumber = parsePositiveInt(params?.page);
  if (!Number.isFinite(pageNumber)) notFound();
  if (pageNumber === 1) redirect(buildLanguagePagePath(language));

  const [categories, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(
      {
        language,
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

  const meta = buildLanguagePageMeta(language, pageNumber);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Language Collection"
        title={meta.heading}
        description={meta.body}
        chips={[language, `${total} titles`, `Page ${pageNumber}`]}
      />

      <MoviesClient
        initialQuery={{
          language,
          pageNumber,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
