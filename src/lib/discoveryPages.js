// frontend-next/src/lib/discoveryPages.js
import { SITE_URL, clean, truncate } from './seo';

const normalizeKey = (value = '') =>
  clean(value)
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const slugifySegment = (value = '') =>
  clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildCanonical = (pathname = '') =>
  `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

const splitBrowseByQuery = (value = '') =>
  String(value || '')
    .split(',')
    .map((v) => clean(v))
    .filter(Boolean);

/**
 * Dedicated Industry landing pages
 * Keep this list in sync with backend/utils/discoveryPages.js
 */
export const INDUSTRY_PAGES = [
  {
    slug: 'hollywood-english',
    label: 'Hollywood English Movies',
    description:
      'Watch Hollywood English movies online free in HD on MovieFrost. Browse blockbuster action, thriller, comedy, drama, and more.',
    browseByValues: ['Hollywood (English)', 'British (English)'],
  },
  {
    slug: 'hollywood-hindi-dubbed',
    label: 'Hollywood Hindi Dubbed Movies',
    description:
      'Watch Hollywood movies in Hindi dubbed online free on MovieFrost. Stream action, thriller, sci-fi, and adventure titles in HD.',
    browseByValues: ['Hollywood (Hindi Dubbed)', 'Hollywood( Hindi Dubbed)'],
  },
  {
    slug: 'hollywood-web-series',
    label: 'Hollywood Web Series',
    description:
      'Watch Hollywood web series online free on MovieFrost. Discover English and Hindi dubbed web series in HD.',
    browseByValues: [
      'Hollywood Web Series (English)',
      'Hollywood Web Series (Hindi Dubbed)',
    ],
  },
  {
    slug: 'bollywood',
    aliases: ['bollywood-hindi'],
    label: 'Bollywood Movies',
    description:
      'Watch Bollywood movies online free in HD on MovieFrost. Browse romance, action, comedy, drama, and new Hindi releases.',
    browseByValues: ['Bollywood', 'Bollywood (Hindi)'],
  },
  {
    slug: 'bollywood-web-series',
    label: 'Bollywood Web Series',
    description:
      'Best Bollywood web series free to watch on MovieFrost. Stream trending Hindi web series and new episodes online.',
    browseByValues: ['Bollywood Web Series', 'Bollywood Web Series (Hindi)'],
  },
  {
    slug: 'korean-drama',
    label: 'Korean Drama',
    description:
      'Watch Korean drama online on MovieFrost. Explore romance, thriller, fantasy, and drama series in HD.',
    browseByValues: ['Korean Drama (Korean)'],
  },
  {
    slug: 'korean-drama-hindi',
    label: 'Korean Drama Hindi Dubbed',
    description:
      'Watch Korean drama Hindi dubbed online free on MovieFrost. Stream Korean titles in Hindi with a smooth HD experience.',
    browseByValues: ['Korean (Hindi Dubbed)'],
  },
  {
    slug: 'korean-english',
    label: 'Korean Movies in English',
    description:
      'Watch Korean movies and series in English online free on MovieFrost. Browse popular Korean titles in HD.',
    browseByValues: ['Korean (English)'],
  },
  {
    slug: 'chinese-drama',
    label: 'Chinese Drama',
    description:
      'Watch Chinese drama online free on MovieFrost. Stream popular Chinese series and trending drama titles in HD.',
    browseByValues: ['Chinease Drama'],
  },
  {
    slug: 'japanese-anime',
    label: 'Japanese Anime',
    description:
      'Watch Japanese Anime online free on MovieFrost. Discover popular anime series, action anime, fantasy anime, and more.',
    browseByValues: ['Japanese Anime'],
  },
  {
    slug: 'japanese-web-series',
    label: 'Japanese Web Series',
    description:
      'Watch Japanese web series online free on MovieFrost. Browse Japanese shows in original and Hindi-dubbed formats.',
    browseByValues: ['Japanese Web Series', 'Japanese Web Series (Hindi)'],
  },
  {
    slug: 'japanese-movies',
    label: 'Japanese Movies',
    description:
      'Watch Japanese movies online free on MovieFrost. Stream action, anime, thriller, and drama movies in HD.',
    browseByValues: ['Japanese (Movies)'],
  },
  {
    slug: 'south-indian-hindi-dubbed',
    label: 'South Indian Hindi Dubbed Movies',
    description:
      'Watch South Indian Hindi dubbed movies online free on MovieFrost. Browse action-packed and trending South titles in HD.',
    browseByValues: ['South Indian (Hindi Dubbed)'],
  },
  {
    slug: 'punjabi-movies',
    label: 'Punjabi Movies',
    description:
      'Watch Punjabi movies online free on MovieFrost. Stream the latest Punjabi comedy, drama, romance, and action titles.',
    browseByValues: ['Indian Punjabi Movies'],
  },
];

const INDUSTRY_BY_SLUG = new Map(
  INDUSTRY_PAGES.map((page) => [normalizeKey(page.slug), page])
);

const INDUSTRY_ALIAS_TO_PAGE = new Map();
for (const page of INDUSTRY_PAGES) {
  for (const alias of page?.aliases || []) {
    const k = normalizeKey(alias);
    if (k && !INDUSTRY_ALIAS_TO_PAGE.has(k)) {
      INDUSTRY_ALIAS_TO_PAGE.set(k, page);
    }
  }
}

export const getIndustryBySlug = (slug) =>
  INDUSTRY_BY_SLUG.get(normalizeKey(slug)) ||
  INDUSTRY_ALIAS_TO_PAGE.get(normalizeKey(slug)) ||
  null;

export const findIndustryByBrowseByQuery = (browseBy = '') => {
  const parts = splitBrowseByQuery(browseBy).map(normalizeKey);
  if (!parts.length) return null;

  return (
    INDUSTRY_PAGES.find((page) => {
      const values = page.browseByValues.map(normalizeKey);
      const valueSet = new Set(values);

      // exact set match
      if (
        parts.length === values.length &&
        parts.every((part) => valueSet.has(part))
      ) {
        return true;
      }

      // single browseBy value belongs to this landing page
      if (parts.length === 1 && valueSet.has(parts[0])) {
        return true;
      }

      return false;
    }) || null
  );
};

export const getIndustryPathByBrowseByQuery = (browseBy = '') => {
  const industry = findIndustryByBrowseByQuery(browseBy);
  return industry ? `/industry/${industry.slug}` : '';
};

export const getBrowseByRelativeHref = (browseBy = '') => {
  const value = clean(browseBy);
  if (!value) return '/movies';

  return (
    getIndustryPathByBrowseByQuery(value) ||
    `/movies?browseBy=${encodeURIComponent(value)}`
  );
};

export const buildGenreCanonical = (category) =>
  buildCanonical(`/genre/${slugifySegment(category)}`);

export const buildIndustryCanonical = (slug) =>
  buildCanonical(`/industry/${slugifySegment(slug)}`);

export const buildLanguageCanonical = (language) =>
  buildCanonical(`/language/${slugifySegment(language)}`);

export const buildYearCanonical = (year) =>
  buildCanonical(`/year/${String(year || '').trim()}`);

export const buildGenrePageMeta = (category) => {
  const name = clean(category) || 'Genre';

  return {
    title: truncate(`Watch ${name} Movies Online Free`, 60),
    description: truncate(
      `Stream ${name} movies and web series online free in HD on MovieFrost. Browse the latest ${name} releases, classics, and fan favorites.`,
      160
    ),
    canonical: buildGenreCanonical(name),
    heading: `${name} Movies`,
    body: `Explore ${name} movies and web series available on MovieFrost. Browse fresh releases, classic favorites, and trending titles in the ${name} category.`,
  };
};

export const buildIndustryPageMeta = (page) => {
  const label = clean(page?.label || 'Industry Collection');
  const description =
    clean(page?.description) ||
    `Stream ${label} online free in HD on MovieFrost.`;

  return {
    title: truncate(`Watch ${label} Online Free`, 60),
    description: truncate(description, 160),
    canonical: buildIndustryCanonical(page?.slug || ''),
    heading: label,
    body: description,
  };
};

export const buildLanguagePageMeta = (language) => {
  const name = clean(language) || 'Language';

  return {
    title: truncate(`Watch ${name} Movies Online Free`, 60),
    description: truncate(
      `Watch ${name} movies and web series online free in HD on MovieFrost. Browse titles available in ${name}.`,
      160
    ),
    canonical: buildLanguageCanonical(name),
    heading: `${name} Movies & Web Series`,
    body: `Browse movies and web series available in ${name} on MovieFrost. Discover trending titles, new releases, and more in HD.`,
  };
};

export const buildYearPageMeta = (year) => {
  const y = String(year || '').trim() || 'Year';

  return {
    title: truncate(`Watch ${y} Movies Online Free`, 60),
    description: truncate(
      `Watch ${y} movies and web series online free in HD on MovieFrost. Explore releases from ${y}, trending titles, and new favorites.`,
      160
    ),
    canonical: buildYearCanonical(y),
    heading: `${y} Movies & Web Series`,
    body: `Discover movies and web series released in ${y} on MovieFrost. Browse popular titles, new arrivals, and fan favorites in HD.`,
  };
};

const buildMoviesFilterCanonical = (query = {}) => {
  const params = new URLSearchParams();

  const set = (key, value) => {
    const v = clean(value);
    if (!v) return;
    params.set(key, v);
  };

  set('type', query?.type);
  set('category', query?.category);
  set('browseBy', query?.browseBy);
  set('language', query?.language);
  set('year', query?.year);
  set('time', query?.time);
  set('rate', query?.rate);
  set('search', query?.search);

  const pageNumber = Number(query?.pageNumber || 1) || 1;
  if (pageNumber > 1) params.set('pageNumber', String(pageNumber));

  const qs = params.toString();
  return qs ? `${SITE_URL}/movies?${qs}` : `${SITE_URL}/movies`;
};

/**
 * Used by /movies page to redirect cleanly to dedicated landing pages
 * when the query is effectively just a landing-page request.
 *
 * Rules:
 * - browseBy -> industry page (type ignored)
 * - category/language/year -> dedicated page only when type is NOT used
 */
export const getDedicatedListingPath = (query = {}) => {
  const category = clean(query?.category);
  const browseBy = clean(query?.browseBy);
  const language = clean(query?.language);
  const year = clean(query?.year);
  const time = clean(query?.time);
  const rate = clean(query?.rate);
  const search = clean(query?.search);
  const type = clean(query?.type);
  const pageNumber = Number(query?.pageNumber || 1) || 1;

  const browseByOnly =
    !search &&
    !time &&
    !rate &&
    pageNumber === 1 &&
    !!browseBy &&
    !category &&
    !language &&
    !year;

  if (browseByOnly) {
    const industryPath = getIndustryPathByBrowseByQuery(browseBy);
    if (industryPath) return industryPath;
  }

  const dedicatedOnly = !search && !time && !rate && !type && pageNumber === 1;

  if (dedicatedOnly && category && !browseBy && !language && !year) {
    return `/genre/${slugifySegment(category)}`;
  }

  if (dedicatedOnly && language && !category && !browseBy && !year) {
    return `/language/${slugifySegment(language)}`;
  }

  if (
    dedicatedOnly &&
    year &&
    !category &&
    !browseBy &&
    !language &&
    /^\d{4}$/.test(year)
  ) {
    return `/year/${year}`;
  }

  return '';
};

/**
 * For /movies page SEO:
 * - plain /movies => indexable
 * - filtered query pages => noindex
 * - browseBy-only query => prefers dedicated industry page even if type exists
 * - category/language/year dedicated pages are preferred only when type is absent
 */
export const buildMoviesQuerySeo = (query = {}) => {
  const category = clean(query?.category);
  const browseBy = clean(query?.browseBy);
  const language = clean(query?.language);
  const year = clean(query?.year);
  const time = clean(query?.time);
  const rate = clean(query?.rate);
  const search = clean(query?.search);
  const type = clean(query?.type);
  const pageNumber = Number(query?.pageNumber || 1) || 1;

  const hasAnyQuery =
    !!category ||
    !!browseBy ||
    !!language ||
    !!year ||
    !!time ||
    !!rate ||
    !!search ||
    !!type ||
    pageNumber > 1;

  if (!hasAnyQuery) {
    return {
      title: 'Movies',
      description:
        'Browse movies and web series by category, language, year, and more on MovieFrost.',
      canonical: `${SITE_URL}/movies`,
      robots: { index: true, follow: true },
    };
  }

  const browseByOnly =
    !search &&
    !time &&
    !rate &&
    pageNumber === 1 &&
    !!browseBy &&
    !category &&
    !language &&
    !year;

  if (browseByOnly) {
    const industry = findIndustryByBrowseByQuery(browseBy);
    if (industry) {
      const meta = buildIndustryPageMeta(industry);
      return { ...meta, robots: { index: false, follow: true } };
    }
  }

  const dedicatedOnly = !search && !time && !rate && !type && pageNumber === 1;

  if (dedicatedOnly && category && !browseBy && !language && !year) {
    const meta = buildGenrePageMeta(category);
    return { ...meta, robots: { index: false, follow: true } };
  }

  if (dedicatedOnly && language && !category && !browseBy && !year) {
    const meta = buildLanguagePageMeta(language);
    return { ...meta, robots: { index: false, follow: true } };
  }

  if (dedicatedOnly && year && !category && !browseBy && !language) {
    const meta = buildYearPageMeta(year);
    return { ...meta, robots: { index: false, follow: true } };
  }

  const label =
    search ||
    category ||
    language ||
    year ||
    browseBy ||
    type ||
    'Filtered Movies';

  return {
    title: truncate(label.startsWith('Search:') ? label : `${label} Movies`, 60),
    description: truncate(
      'Filtered movie and web series listing on MovieFrost.',
      160
    ),
    canonical: buildMoviesFilterCanonical(query),
    robots: { index: false, follow: true },
  };
};
