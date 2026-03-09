// frontend-next/src/app/language/[slug]/page.jsx
import { notFound } from 'next/navigation';

import MoviesClient from '../../../components/movies/MoviesClient';
import SeoLandingHero from '../../../components/movies/SeoLandingHero';

import { getBrowseByDistinct, getCategories, getMovies } from '../../../lib/api';
import {
  buildLanguagePageMeta,
  slugifySegment,
} from '../../../lib/discoveryPages';
import { LanguageData } from '../../../data/filterData';

export const revalidate = 3600;
export const dynamicParams = true;

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

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((language) => ({
    slug: slugifySegment(language),
  }));
}

export async function generateMetadata({ params }) {
  const language = pickLanguageBySlug(params.slug);

  if (!language) {
    return {
      title: 'Language not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildLanguagePageMeta(language);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function LanguagePage({ params }) {
  const language = pickLanguageBySlug(params.slug);
  if (!language) notFound();

  const [categories, browseByDistinct, data] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
    getMovies(
      {
        language,
        pageNumber: 1,
      },
      { revalidate: 300 }
    ).catch(() => ({ movies: [], page: 1, pages: 1, totalMovies: 0 })),
  ]);

  if (!Array.isArray(data?.movies) || data.movies.length === 0) {
    notFound();
  }

  const meta = buildLanguagePageMeta(language);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Language Collection"
        title={meta.heading}
        description={meta.body}
        chips={[language, `${total} titles`, 'Language Landing Page']}
      />

      <MoviesClient
        initialQuery={{
          language,
          pageNumber: 1,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
