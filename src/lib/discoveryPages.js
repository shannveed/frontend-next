// frontend-next/src/lib/discoveryPages.js
import { LanguageData } from '../data/filterData';
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

const normalizePageNumber = (value = 1) => {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return 1;

  const n = Number(raw);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
};

const appendPaginatedPath = (basePath = '', pageNumber = 1) => {
  const p = normalizePageNumber(pageNumber);
  if (p <= 1) return basePath;
  return `${basePath.replace(/\/+$/, '')}/page/${p}`;
};

const splitBrowseByQuery = (value = '') =>
  String(value || '')
    .split(',')
    .map((v) => clean(v))
    .filter(Boolean);

const normalizeTypeParam = (value = '') => {
  const v = normalizeKey(value).replace(/[-\s]+/g, '');
  if (!v) return '';

  if (v === 'movie' || v === 'movies') return 'Movie';

  if (
    v === 'webseries' ||
    v === 'tvshow' ||
    v === 'tvshows' ||
    v === 'series'
  ) {
    return 'WebSeries';
  }

  return '';
};

const isSimpleCategoryPageCandidate = (value = '') => {
  const v = clean(value);
  if (!v) return false;
  return !/[,/|;&]/.test(v);
};

const isYearPageCandidate = (value = '') =>
  /^\d{4}$/.test(String(value || '').trim());

export const TYPE_PAGES = [
  {
    slug: 'movie',
    type: 'Movie',
    label: 'Movies',
    description:
      'Watch movies online free in HD on MovieFrost. Browse action, drama, comedy, thriller, romance, and new releases.',
  },
  {
    slug: 'web-series',
    type: 'WebSeries',
    label: 'Web Series',
    description:
      'Watch web series online free in HD on MovieFrost. Explore trending series, seasons, episodes, and fresh releases.',
  },
];

const TYPE_BY_SLUG = new Map(
  TYPE_PAGES.map((page) => [normalizeKey(page.slug), page])
);

const TYPE_BY_TYPE = new Map(
  TYPE_PAGES.map((page) => [normalizeKey(page.type), page])
);

export const SUPPORTED_LANGUAGE_PAGES = LanguageData.map((item) =>
  clean(item?.title)
).filter((title) => title && !/^sort by/i.test(title));

const SUPPORTED_LANGUAGE_SET = new Set(
  SUPPORTED_LANGUAGE_PAGES.map((title) => normalizeKey(title))
);

export const isSupportedLanguagePage = (language = '') =>
  SUPPORTED_LANGUAGE_SET.has(normalizeKey(language));

export const getTypePageBySlug = (slug) =>
  TYPE_BY_SLUG.get(normalizeKey(slug)) || null;

export const getTypePageByType = (type) => {
  const normalized = normalizeTypeParam(type);
  if (!normalized) return null;
  return TYPE_BY_TYPE.get(normalizeKey(normalized)) || null;
};

export const buildAllMoviesPagePath = (pageNumber = 1) =>
  appendPaginatedPath('/movies', pageNumber);

export const buildTypePagePath = (typeOrPage, pageNumber = 1) => {
  const page =
    typeof typeOrPage === 'object'
      ? typeOrPage
      : getTypePageByType(typeOrPage) || getTypePageBySlug(typeOrPage);

  if (!page) return '/movies';

  return appendPaginatedPath(`/movies/type/${page.slug}`, pageNumber);
};

export const buildGenrePagePath = (category, pageNumber = 1) => {
  const slug = slugifySegment(category);
  if (!slug) return '/movies';
  return appendPaginatedPath(`/genre/${slug}`, pageNumber);
};

export const buildIndustryPagePath = (slugOrPage, pageNumber = 1) => {
  const rawSlug =
    typeof slugOrPage === 'object' ? clean(slugOrPage?.slug) : clean(slugOrPage);
  const slug = slugifySegment(rawSlug);

  if (!slug) return '/movies';

  return appendPaginatedPath(`/industry/${slug}`, pageNumber);
};

export const buildLanguagePagePath = (language, pageNumber = 1) => {
  const slug = slugifySegment(language);
  if (!slug) return '/movies';
  return appendPaginatedPath(`/language/${slug}`, pageNumber);
};

export const buildYearPagePath = (year, pageNumber = 1) => {
  const y = String(year || '').trim();
  if (!y) return '/movies';
  return appendPaginatedPath(`/year/${y}`, pageNumber);
};

const withPaginatedMeta = (base, canonicalPath, pageNumber = 1) => {
  const p = normalizePageNumber(pageNumber);
  const canonical = buildCanonical(canonicalPath);

  if (p <= 1) {
    return { ...base, canonical };
  }

  const pageLabel = `Page ${p}`;

  return {
    ...base,
    title: truncate(`${clean(base.title)} - ${pageLabel}`, 60),
    description: truncate(`${clean(base.description)} ${pageLabel}.`, 160),
    canonical,
    heading: `${clean(base.heading)} - ${pageLabel}`,
    body: truncate(
      `${clean(base.body)} Continue browsing ${pageLabel.toLowerCase()} on MovieFrost.`,
      240
    ),
  };
};

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

export const getIndustryBySlug = (slug) =>
  INDUSTRY_BY_SLUG.get(normalizeKey(slug)) || null;

export const findIndustryByBrowseByQuery = (browseBy = '') => {
  const parts = splitBrowseByQuery(browseBy).map(normalizeKey);
  if (!parts.length) return null;

  return (
    INDUSTRY_PAGES.find((page) => {
      const values = page.browseByValues.map(normalizeKey);
      const valueSet = new Set(values);

      if (
        parts.length === values.length &&
        parts.every((part) => valueSet.has(part))
      ) {
        return true;
      }

      if (parts.length === 1 && valueSet.has(parts[0])) {
        return true;
      }

      return false;
    }) || null
  );
};

export const getBrowseByListingPath = (browseBy = '', pageNumber = 1) => {
  const value = clean(browseBy);
  if (!value) return '/movies';

  const industry = findIndustryByBrowseByQuery(value);
  if (industry) return buildIndustryPagePath(industry, pageNumber);

  const params = new URLSearchParams();
  params.set('browseBy', value);

  const p = normalizePageNumber(pageNumber);
  if (p > 1) params.set('pageNumber', String(p));

  return `/movies?${params.toString()}`;
};

export const buildAllMoviesCanonical = (pageNumber = 1) =>
  buildCanonical(buildAllMoviesPagePath(pageNumber));

export const buildTypeCanonical = (typeOrPage, pageNumber = 1) =>
  buildCanonical(buildTypePagePath(typeOrPage, pageNumber));

export const buildGenreCanonical = (category, pageNumber = 1) =>
  buildCanonical(buildGenrePagePath(category, pageNumber));

export const buildIndustryCanonical = (slugOrPage, pageNumber = 1) =>
  buildCanonical(buildIndustryPagePath(slugOrPage, pageNumber));

export const buildLanguageCanonical = (language, pageNumber = 1) =>
  buildCanonical(buildLanguagePagePath(language, pageNumber));

export const buildYearCanonical = (year, pageNumber = 1) =>
  buildCanonical(buildYearPagePath(year, pageNumber));

export const buildAllMoviesPageMeta = (pageNumber = 1) => {
  const base = {
    title: 'Movies',
    description:
      'Browse movies and web series by category, language, year, and more on MovieFrost.',
    canonical: `${SITE_URL}/movies`,
    heading: 'Movies',
    body: 'Browse movies and web series by category, language, year, and more on MovieFrost.',
  };

  return withPaginatedMeta(base, buildAllMoviesPagePath(pageNumber), pageNumber);
};

export const buildTypePageMeta = (typeOrPage, pageNumber = 1) => {
  const page =
    typeof typeOrPage === 'object'
      ? typeOrPage
      : getTypePageByType(typeOrPage) || getTypePageBySlug(typeOrPage);

  if (!page) {
    return buildAllMoviesPageMeta(pageNumber);
  }

  const base = {
    title: truncate(`Watch ${page.label} Online Free`, 60),
    description: truncate(page.description, 160),
    canonical: buildTypeCanonical(page),
    heading: page.label,
    body: page.description,
  };

  return withPaginatedMeta(base, buildTypePagePath(page, pageNumber), pageNumber);
};

export const buildGenrePageMeta = (category, pageNumber = 1) => {
  const name = clean(category) || 'Genre';

  const base = {
    title: truncate(`Watch ${name} Movies Online Free`, 60),
    description: truncate(
      `Stream ${name} movies and web series online free in HD on MovieFrost. Browse the latest ${name} releases, classics, and fan favorites.`,
      160
    ),
    canonical: buildGenreCanonical(name),
    heading: `${name} Movies`,
    body: `Explore ${name} movies and web series available on MovieFrost. Browse fresh releases, classic favorites, and trending titles in the ${name} category.`,
  };

  return withPaginatedMeta(base, buildGenrePagePath(name, pageNumber), pageNumber);
};

export const buildIndustryPageMeta = (page, pageNumber = 1) => {
  const label = clean(page?.label || 'Industry Collection');
  const description =
    clean(page?.description) ||
    `Stream ${label} online free in HD on MovieFrost.`;

  const base = {
    title: truncate(`Watch ${label} Online Free`, 60),
    description: truncate(description, 160),
    canonical: buildIndustryCanonical(page?.slug || ''),
    heading: label,
    body: description,
  };

  return withPaginatedMeta(
    base,
    buildIndustryPagePath(page?.slug || '', pageNumber),
    pageNumber
  );
};

export const buildLanguagePageMeta = (language, pageNumber = 1) => {
  const name = clean(language) || 'Language';

  const base = {
    title: truncate(`Watch ${name} Movies Online Free`, 60),
    description: truncate(
      `Watch ${name} movies and web series online free in HD on MovieFrost. Browse titles available in ${name}.`,
      160
    ),
    canonical: buildLanguageCanonical(name),
    heading: `${name} Movies & Web Series`,
    body: `Browse movies and web series available in ${name} on MovieFrost. Discover trending titles, new releases, and more in HD.`,
  };

  return withPaginatedMeta(
    base,
    buildLanguagePagePath(name, pageNumber),
    pageNumber
  );
};

export const buildYearPageMeta = (year, pageNumber = 1) => {
  const y = String(year || '').trim() || 'Year';

  const base = {
    title: truncate(`Watch ${y} Movies Online Free`, 60),
    description: truncate(
      `Watch ${y} movies and web series online free in HD on MovieFrost. Explore releases from ${y}, trending titles, and new favorites.`,
      160
    ),
    canonical: buildYearCanonical(y),
    heading: `${y} Movies & Web Series`,
    body: `Discover movies and web series released in ${y} on MovieFrost. Browse popular titles, new arrivals, and fan favorites in HD.`,
  };

  return withPaginatedMeta(base, buildYearPagePath(y, pageNumber), pageNumber);
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

export const getDedicatedListingPath = (query = {}) => {
  const type = clean(query?.type);
  const category = clean(query?.category);
  const browseBy = clean(query?.browseBy);
  const language = clean(query?.language);
  const year = clean(query?.year);
  const time = clean(query?.time);
  const rate = clean(query?.rate);
  const search = clean(query?.search);
  const pageNumber = normalizePageNumber(query?.pageNumber || 1);

  const hasSeoFilter = [type, category, browseBy, language, year].some(Boolean);

  // plain paginated /movies/page/N
  if (!search && !time && !rate && !hasSeoFilter && pageNumber > 1) {
    return buildAllMoviesPagePath(pageNumber);
  }

  // single dedicated landing pages only
  if (search || time || rate) return '';

  const activeSeoFilters = [type, category, browseBy, language, year].filter(Boolean);
  if (activeSeoFilters.length !== 1) return '';

  if (type) {
    const page = getTypePageByType(type);
    return page ? buildTypePagePath(page, pageNumber) : '';
  }

  if (category) {
    if (!isSimpleCategoryPageCandidate(category)) return '';
    return buildGenrePagePath(category, pageNumber);
  }

  if (browseBy) {
    const industry = findIndustryByBrowseByQuery(browseBy);
    return industry ? buildIndustryPagePath(industry, pageNumber) : '';
  }

  if (language) {
    return isSupportedLanguagePage(language)
      ? buildLanguagePagePath(language, pageNumber)
      : '';
  }

  if (year) {
    return isYearPageCandidate(year) ? buildYearPagePath(year, pageNumber) : '';
  }

  return '';
};

/**
 * For /movies page SEO:
 * - plain /movies => indexable
 * - dedicated simple query pages => canonical to static route + noindex on query URL
 * - filtered query combos => noindex
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

  // plain paginated movies query => canonical to /movies/page/N
  if (
    !search &&
    !time &&
    !rate &&
    !type &&
    !category &&
    !browseBy &&
    !language &&
    !year &&
    pageNumber > 1
  ) {
    const meta = buildAllMoviesPageMeta(pageNumber);
    return {
      ...meta,
      robots: { index: false, follow: true },
    };
  }

  const dedicatedPath = getDedicatedListingPath(query);

  if (dedicatedPath) {
    if (type) {
      const meta = buildTypePageMeta(type, pageNumber);
      return { ...meta, robots: { index: false, follow: true } };
    }

    if (category && isSimpleCategoryPageCandidate(category)) {
      const meta = buildGenrePageMeta(category, pageNumber);
      return { ...meta, robots: { index: false, follow: true } };
    }

    if (browseBy) {
      const industry = findIndustryByBrowseByQuery(browseBy);
      if (industry) {
        const meta = buildIndustryPageMeta(industry, pageNumber);
        return { ...meta, robots: { index: false, follow: true } };
      }
    }

    if (language && isSupportedLanguagePage(language)) {
      const meta = buildLanguagePageMeta(language, pageNumber);
      return { ...meta, robots: { index: false, follow: true } };
    }

    if (year && isYearPageCandidate(year)) {
      const meta = buildYearPageMeta(year, pageNumber);
      return { ...meta, robots: { index: false, follow: true } };
    }
  }

  const typeLabel = getTypePageByType(type)?.label || '';
  const industryLabel = findIndustryByBrowseByQuery(browseBy)?.label || browseBy;

  const label =
    search ||
    category ||
    language ||
    year ||
    industryLabel ||
    typeLabel ||
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
