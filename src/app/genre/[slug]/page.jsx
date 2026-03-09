// frontend-next/src/app/genre/[slug]/page.jsx
import { notFound } from 'next/navigation';

import MoviesClient from '../../../components/movies/MoviesClient';
import SeoLandingHero from '../../../components/movies/SeoLandingHero';

import { getBrowseByDistinct, getCategories, getMovies } from '../../../lib/api';
import {
  buildGenrePageMeta,
  slugifySegment,
} from '../../../lib/discoveryPages';

export const revalidate = 3600;
export const dynamicParams = true;

const pickCategoryBySlug = (categories = [], slug = '') => {
  const target = String(slug || '').trim().toLowerCase();
  return (
    categories.find((cat) => slugifySegment(cat?.title) === target) || null
  );
};

export async function generateStaticParams() {
  const categories = await getCategories({ revalidate: 3600 }).catch(() => []);

  return (Array.isArray(categories) ? categories : [])
    .map((cat) => ({ slug: slugifySegment(cat?.title) }))
    .filter((item) => item.slug);
}

export async function generateMetadata({ params }) {
  const categories = await getCategories({ revalidate: 3600 }).catch(() => []);
  const category = pickCategoryBySlug(categories, params.slug);

  if (!category) {
    return {
      title: 'Genre not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildGenrePageMeta(category.title);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

export default async function GenrePage({ params }) {
  const [categories, browseByDistinct] = await Promise.all([
    getCategories({ revalidate: 3600 }).catch(() => []),
    getBrowseByDistinct({ revalidate: 3600 }).catch(() => []),
  ]);

  const category = pickCategoryBySlug(categories, params.slug);
  if (!category) notFound();

  const data = await getMovies(
    {
      category: category.title,
      pageNumber: 1,
    },
    { revalidate: 300 }
  ).catch(() => ({ movies: [], page: 1, pages: 1, totalMovies: 0 }));

  if (!Array.isArray(data?.movies) || data.movies.length === 0) {
    notFound();
  }

  const meta = buildGenrePageMeta(category.title);
  const total = Number(data?.totalMovies || data?.movies?.length || 0);

  return (
    <>
      <SeoLandingHero
        eyebrow="Genre Collection"
        title={meta.heading}
        description={meta.body}
        chips={[category.title, `${total} titles`, 'SEO Landing Page']}
      />

      <MoviesClient
        initialQuery={{
          category: category.title,
          pageNumber: 1,
        }}
        initialData={data}
        categories={Array.isArray(categories) ? categories : []}
        browseByDistinct={Array.isArray(browseByDistinct) ? browseByDistinct : []}
      />
    </>
  );
}
