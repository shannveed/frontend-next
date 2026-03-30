// frontend-next/src/lib/blogCategories.js
import { SITE_URL } from './seo';

const clean = (value = '') => String(value ?? '').trim();

export const BLOG_TEMPLATE_TYPES = [
  'list',
  'review',
  'explained',
  'movies-like',
  'upcoming',
];

const BLOG_TEMPLATE_LABELS = {
  list: 'List',
  review: 'Review',
  explained: 'Explained',
  'movies-like': 'Movies Like',
  upcoming: 'Upcoming',
};

export const formatBlogTemplateType = (value = '') => {
  const key = clean(value).toLowerCase();
  return BLOG_TEMPLATE_LABELS[key] || clean(value);
};

export const BLOG_CATEGORIES = [
  {
    slug: 'best-movie-lists',
    title: 'Best Movie Lists',
    emoji: '📊',
    templateType: 'list',
    description: 'Rankings, top movie lists, and curated collections.',
  },
  {
    slug: 'movie-reviews',
    title: 'Movie Reviews',
    emoji: '🎬',
    templateType: 'review',
    description: 'Reviews, verdicts, ratings, and analysis.',
  },
  {
    slug: 'movie-explained',
    title: 'Movie Explained',
    emoji: '🧠',
    templateType: 'explained',
    description: 'Ending explained, plot breakdowns, and theories.',
  },
  {
    slug: 'movies-like',
    title: 'Movies Like',
    emoji: '📺',
    templateType: 'movies-like',
    description: 'Recommendation articles based on similar movies.',
  },
  {
    slug: 'upcoming-movies',
    title: 'Upcoming Movies',
    emoji: '🎥',
    templateType: 'upcoming',
    description: 'Release dates, cast, trailer, and new updates.',
  },
];

const BLOG_CATEGORY_MAP = new Map(
  BLOG_CATEGORIES.map((item) => [clean(item.slug).toLowerCase(), item])
);

export const BLOG_HOME_PATH = '/blog';
export const BLOG_TRENDING_PATH = '/blog/trending-articles';

export const getBlogCategoryBySlug = (slug = '') =>
  BLOG_CATEGORY_MAP.get(clean(slug).toLowerCase()) || null;

export const isValidBlogCategorySlug = (slug = '') =>
  BLOG_CATEGORY_MAP.has(clean(slug).toLowerCase());

export const buildBlogHomePath = () => BLOG_HOME_PATH;

export const buildBlogTrendingPath = () => BLOG_TRENDING_PATH;

export const buildBlogCategoryPath = (categorySlug = '') => {
  const slug = clean(categorySlug);
  return slug ? `/blog/${slug}` : BLOG_HOME_PATH;
};

export const buildBlogPostPath = (categorySlug = '', slug = '') => {
  const category = clean(categorySlug);
  const postSlug = clean(slug);

  if (!category || !postSlug) return BLOG_HOME_PATH;
  return `/blog/${category}/${postSlug}`;
};

export const buildBlogHomeCanonical = () => `${SITE_URL}${BLOG_HOME_PATH}`;

export const buildBlogTrendingCanonical = () =>
  `${SITE_URL}${BLOG_TRENDING_PATH}`;

export const buildBlogCategoryCanonical = (categorySlug = '') =>
  `${SITE_URL}${buildBlogCategoryPath(categorySlug)}`;

export const buildBlogPostCanonical = (categorySlug = '', slug = '') =>
  `${SITE_URL}${buildBlogPostPath(categorySlug, slug)}`;

export default {
  BLOG_CATEGORIES,
  BLOG_TEMPLATE_TYPES,
  formatBlogTemplateType,
  BLOG_HOME_PATH,
  BLOG_TRENDING_PATH,
  getBlogCategoryBySlug,
  isValidBlogCategorySlug,
  buildBlogHomePath,
  buildBlogTrendingPath,
  buildBlogCategoryPath,
  buildBlogPostPath,
  buildBlogHomeCanonical,
  buildBlogTrendingCanonical,
  buildBlogCategoryCanonical,
  buildBlogPostCanonical,
};
