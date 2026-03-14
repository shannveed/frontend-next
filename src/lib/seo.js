// frontend-next/src/lib/seo.js

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com'
).replace(/\/+$/, '');

export const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

export const truncate = (text, max = 155) => {
  const t = clean(text);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
};

export const absoluteUrl = (maybeUrl) => {
  const u = clean(maybeUrl);
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
};

/* ============================
   Person / Actor helpers
   ============================ */
export const personSlug = (name = '') =>
  clean(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const actorCanonicalBySlug = (slug) => `${SITE_URL}/actor/${clean(slug)}`;
export const actorCanonicalByName = (name) =>
  actorCanonicalBySlug(personSlug(name));

/* ============================
   Canonicals
   ============================ */
export const movieCanonical = (movie) => {
  const seg = clean(movie?.slug) || String(movie?._id || '');
  return `${SITE_URL}/movie/${seg}`;
};

export const watchUrl = (movie) => {
  const seg = clean(movie?.slug) || String(movie?._id || '');
  return `${SITE_URL}/watch/${seg}`;
};

// /watch canonical to itself
export const watchCanonical = (movie) => watchUrl(movie);

/* ============================================================
   Title normalization helpers
   ============================================================ */

const escapeRegex = (value = '') =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesYearToken = (text, year) => {
  const y = String(year || '').trim();
  if (!y) return false;
  return new RegExp(`\\b${escapeRegex(y)}\\b`).test(String(text || ''));
};

// Remove leading "Watch", trailing "Online Free" etc if someone put it in name
const stripObviousPrefixSuffix = (raw = '') => {
  let t = clean(raw);

  t = t.replace(/^(?:watch)\s*[:\-–—]?\s*/i, '');
  t = t.replace(/\s*\|\s*moviefrost\s*$/i, '');
  t = t.replace(
    /\s+(?:watch\s+online|online\s+free|full\s+movie|full\s+hd|download)\s*$/i,
    ''
  );

  return clean(t);
};

const isMarketingSegment = (seg = '') => {
  const s = clean(seg).toLowerCase();
  if (!s) return false;

  if (/\bwatch\b/.test(s)) return true;
  if (/\bonline\b/.test(s)) return true;
  if (/\bdownload\b/.test(s)) return true;
  if (/\bstream(?:ing)?\b/.test(s)) return true;

  const hasQuality = /\b(full|hd|4k|1080p|720p)\b/.test(s);
  const hasMovieWord = /\bmovie\b/.test(s);

  if (hasQuality && hasMovieWord) return true;
  if (/^(?:full\s+)?movie$/.test(s)) return true;

  return false;
};

const stripTrailingMarketingSegments = (raw = '') => {
  const t = clean(raw);
  if (!t) return '';

  const parts = t.split(/\s(?:\||-|—|–)\s/);
  if (parts.length <= 1) return t;

  let end = parts.length;
  while (end > 1 && isMarketingSegment(parts[end - 1])) end -= 1;

  return clean(parts.slice(0, end).join(' - '));
};

const normalizeMovieNameForSeo = (movie) => {
  const nameRaw = movie?.name || '';
  let name = stripObviousPrefixSuffix(nameRaw);
  name = stripTrailingMarketingSegments(name);
  return clean(name);
};

export const buildMovieNameWithYear = (movie) => {
  const base = normalizeMovieNameForSeo(movie) || 'Movie';

  const y = Number(movie?.year);
  if (Number.isFinite(y) && y > 0 && !includesYearToken(base, y)) {
    return `${base} (${y})`;
  }

  return base;
};

// Truncate the name part but try to keep trailing "(YYYY)" if present
const clampNameKeepTrailingYear = (nameWithYear, maxLen) => {
  const s = clean(nameWithYear);
  if (s.length <= maxLen) return s;

  const m = s.match(/\((\d{4})\)\s*$/);
  if (m) {
    const yearSuffix = `(${m[1]})`;
    const body = clean(s.slice(0, m.index));

    const needed = yearSuffix.length + 1;
    const avail = maxLen - needed;

    if (avail <= 1) return yearSuffix;

    const bodyClipped =
      body.length > avail
        ? body.slice(0, Math.max(1, avail - 1)).trimEnd() + '…'
        : body;

    return clean(`${bodyClipped} ${yearSuffix}`);
  }

  return s.slice(0, Math.max(1, maxLen - 1)).trimEnd() + '…';
};

const buildPatternTitle = (
  nameWithYear,
  { maxLen = 60, prefix = '', suffix = '' } = {}
) => {
  const p = String(prefix);
  const suf = String(suffix);

  const nameMax = Math.max(10, maxLen - p.length - suf.length);
  const clippedName = clampNameKeepTrailingYear(nameWithYear, nameMax);

  return clean(`${p}${clippedName}${suf}`);
};

/* ============================================================
   Stable rotating SEO title patterns
   ============================================================ */

const MOVIE_TITLE_SUFFIX_VARIATIONS = [
  ' Full Movie Online Free HD Streaming',
  ' Full Movie HD | Watch Online Free',
  ' Full Movie Streaming Online HD',
];

const WEBSERIES_TITLE_SUFFIX_VARIATIONS = [
  ' Web Series Online Free HD Streaming',
  ' Web Series HD | Watch Online Free',
  ' Web Series Streaming Online HD',
];

const stablePatternIndex = (value = '', size = 1) => {
  const text = clean(value);
  if (!text || size <= 1) return 0;

  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash % size;
};

const getTitlePatternKey = (movie) =>
  clean(
    movie?._id ||
    movie?.slug ||
    `${movie?.name || ''}-${movie?.year || ''}-${movie?.type || ''}`
  );

const getTitleSuffixVariations = (movie) =>
  movie?.type === 'WebSeries'
    ? WEBSERIES_TITLE_SUFFIX_VARIATIONS
    : MOVIE_TITLE_SUFFIX_VARIATIONS;

/* ============================================================
   SEO title pattern for movie pages
   ============================================================ */

const joinNaturalList = (items = []) => {
  const list = (items || []).map(clean).filter(Boolean);

  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;

  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
};

const joinTitleBits = (items = []) => {
  const list = (items || []).map(clean).filter(Boolean);

  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;

  return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
};

const buildMovieTitleInfo = (movie) => {
  const bits = ['Cast', movie?.type === 'WebSeries' ? 'Episodes' : 'Plot'];

  // Keep title accurate: only mention Trailer if trailerUrl exists
  if (clean(movie?.trailerUrl)) bits.push('Trailer');

  bits.push('Streaming Info');

  return joinTitleBits(bits);
};

export const buildMovieTitle = (movie, { maxLen = 100 } = {}) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  const suffix = ` HD | ${buildMovieTitleInfo(movie)} | MovieFrost`;

  return buildPatternTitle(nameWithYear, {
    maxLen,
    prefix: 'Watch ',
    suffix,
  });
};

export const buildMovieDescription = (movie) => {
  const custom = clean(movie?.seoDescription);
  if (custom) return truncate(custom, 160);

  const nameWithYear = buildMovieNameWithYear(movie);
  const director = clean(movie?.director);
  const isSeries = movie?.type === 'WebSeries';
  const hasRuntime =
    Number.isFinite(Number(movie?.time)) && Number(movie?.time) > 0;
  const hasTrailer = !!clean(movie?.trailerUrl);

  const facts = [
    'cast',
    isSeries ? 'storyline' : 'plot summary',
    ...(hasRuntime ? [isSeries ? 'runtime details' : 'runtime'] : []),
    ...(hasTrailer ? ['trailer'] : []),
    'ratings',
    isSeries ? 'season and episode details' : 'viewing options',
  ];

  let description = `Explore the ${joinNaturalList(facts)} for ${nameWithYear}`;
  if (director && !isSeries) description += `, directed by ${director}`;
  description += '.';

  return truncate(description, 160);
};

/* ============================================================
   FAQPage + VideoObject helpers
   ============================================================ */

const normalizeFaqEntries = (faqs = []) =>
  (Array.isArray(faqs) ? faqs : [])
    .map((f) => ({
      question: clean(f?.question),
      answer: clean(f?.answer),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 5);

const looksLikeDirectVideo = (maybeUrl = '') => {
  const raw = clean(maybeUrl);
  if (!raw) return false;

  try {
    const u = new URL(raw);
    return /\.(mp4|webm|ogg|m3u8)$/i.test(u.pathname);
  } catch {
    return /\.(mp4|webm|ogg|m3u8)$/i.test(raw);
  }
};

const getYoutubeId = (value = '') => {
  const raw = clean(value);
  if (!raw) return '';

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return clean(u.pathname.split('/').filter(Boolean)[0]);
    }

    if (host.includes('youtube.com') || host.includes('m.youtube.com')) {
      const v = clean(u.searchParams.get('v'));
      if (v) return v;

      const parts = u.pathname.split('/').filter(Boolean);

      const embedIdx = parts.indexOf('embed');
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        return clean(parts[embedIdx + 1]);
      }

      const shortsIdx = parts.indexOf('shorts');
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
        return clean(parts[shortsIdx + 1]);
      }
    }
  } catch {
    // ignore
  }

  return '';
};

const getVimeoId = (value = '') => {
  const raw = clean(value);
  if (!raw) return '';

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();

    if (host.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const last = clean(parts[parts.length - 1]);
      if (/^\d+$/.test(last)) return last;
    }
  } catch {
    // ignore
  }

  return '';
};

const getEmbeddableTrailerUrl = (maybeUrl = '') => {
  const raw = clean(maybeUrl);
  if (!raw) return '';

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();

    if (
      (host.includes('youtube.com') && /\/embed\//i.test(u.pathname)) ||
      (host.includes('player.vimeo.com') && /\/video\//i.test(u.pathname)) ||
      /\/embed\//i.test(u.pathname)
    ) {
      return raw;
    }
  } catch {
    // ignore
  }

  const yt = getYoutubeId(raw);
  if (yt) return `https://www.youtube.com/embed/${yt}?rel=0`;

  const vimeo = getVimeoId(raw);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;

  return '';
};

const getSchemaDate = (movie) => {
  const candidates = [movie?.createdAt, movie?.updatedAt];

  for (const value of candidates) {
    if (!value) continue;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const year = Number(movie?.year);
  if (Number.isFinite(year) && year > 1800) {
    return new Date(Date.UTC(year, 0, 1)).toISOString();
  }

  return undefined;
};

export const buildMovieFaqPageJsonLd = (movie) => {
  const canonical = movieCanonical(movie);
  const faqs = normalizeFaqEntries(movie?.faqs);

  if (!faqs.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    url: canonical,
    about: { '@id': canonical },
    mainEntity: faqs.map((f, idx) => ({
      '@type': 'Question',
      '@id': `${canonical}#faq-question-${idx + 1}`,
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
};

export const buildMovieTrailerVideoJsonLd = (movie) => {
  const canonical = movieCanonical(movie);
  const trailerUrl = clean(movie?.trailerUrl);

  if (!trailerUrl) return null;

  const rawTrailerUrl = absoluteUrl(trailerUrl);
  if (!rawTrailerUrl) return null;

  const directVideo = looksLikeDirectVideo(rawTrailerUrl);
  const embedUrl = directVideo
    ? ''
    : getEmbeddableTrailerUrl(rawTrailerUrl) || rawTrailerUrl;

  const image = absoluteUrl(
    movie?.titleImage || movie?.image || '/images/MOVIEFROST.png'
  );

  const uploadDate = getSchemaDate(movie);

  return {
    '@type': 'VideoObject',
    '@id': `${canonical}#trailer`,
    name: `${buildMovieNameWithYear(movie)} Trailer`,
    description: truncate(
      movie?.seoDescription ||
      movie?.desc ||
      `${buildMovieNameWithYear(movie)} trailer on MovieFrost.`,
      300
    ),
    url: canonical,
    ...(image ? { thumbnailUrl: [image] } : {}),
    ...(uploadDate ? { uploadDate } : {}),
    ...(directVideo ? { contentUrl: rawTrailerUrl } : {}),
    ...(!directVideo && embedUrl ? { embedUrl } : {}),
    ...(clean(movie?.language) ? { inLanguage: clean(movie.language) } : {}),
    isFamilyFriendly: true,
    publisher: { '@id': `${SITE_URL}#organization` },
    about: { '@id': canonical },
  };
};

/* ============================
   Breadcrumb
   ============================ */
export const buildBreadcrumbJsonLd = (movie) => {
  const canonical = movieCanonical(movie);
  const label = buildMovieNameWithYear(movie) || clean(movie?.name || 'Movie');

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Movies',
        item: `${SITE_URL}/movies`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: label,
        item: canonical,
      },
    ],
  };
};

const asNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const minutesToIsoDuration = (minutes) => {
  const n = asNumber(minutes);
  if (n === null || n <= 0) return null;

  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);

  let out = 'PT';
  if (hrs > 0) out += `${hrs}H`;
  if (mins > 0) out += `${mins}M`;

  if (out === 'PT') out = `PT${Math.round(n)}M`;
  return out;
};

/**
 * IMPORTANT:
 * We DO NOT output third-party ratings as schema.org "Review" objects.
 * Instead, we expose external ratings only as:
 * - sameAs (links)
 * - additionalProperty (informational)
 */
const buildExternalRatingNodes = (movie) => {
  const imdb = movie?.externalRatings?.imdb || {};
  const rt = movie?.externalRatings?.rottenTomatoes || {};

  const imdbRating = asNumber(imdb.rating);
  const imdbVotes = asNumber(imdb.votes);
  const imdbUrl =
    clean(imdb.url) ||
    (movie?.imdbId ? `https://www.imdb.com/title/${clean(movie.imdbId)}/` : '');

  const rtRating = asNumber(rt.rating);
  const rtUrl =
    clean(rt.url) ||
    (movie?.name
      ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
        movie.name
      )}`
      : '');

  const additionalProperty = [];
  const sameAs = [];

  if (imdbUrl) sameAs.push(imdbUrl);
  if (rtUrl) sameAs.push(rtUrl);

  if (imdbRating !== null) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'IMDb rating',
      value:
        imdbVotes !== null
          ? `${imdbRating}/10 (${imdbVotes.toLocaleString()} votes)`
          : `${imdbRating}/10`,
      ...(imdbUrl ? { url: imdbUrl } : {}),
    });
  }

  if (rtRating !== null) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Rotten Tomatoes',
      value: `${rtRating}%`,
      ...(rtUrl ? { url: rtUrl } : {}),
    });
  }

  return { additionalProperty, sameAs };
};

/**
 * On-site aggregate rating (your own users)
 */
const buildSiteAggregateRating = (movie) => {
  const count = asNumber(movie?.numberOfReviews);
  const avg = asNumber(movie?.rate);

  if (!count || count < 1) return null;
  if (avg === null || avg <= 0) return null;

  const ratingValue = Math.max(1, Math.min(5, avg));

  return {
    '@type': 'AggregateRating',
    ratingValue: ratingValue.toFixed(1),
    ratingCount: Math.round(count),
    reviewCount: Math.round(count),
    bestRating: '5',
    worstRating: '1',
  };
};

/* ============================
   Movie/TVSeries node
   ============================ */
export const buildMovieJsonLd = (movie) => {
  const canonical = movieCanonical(movie);
  const isSeries = movie?.type === 'WebSeries';
  const schemaType = isSeries ? 'TVSeries' : 'Movie';

  const image = absoluteUrl(
    movie?.titleImage || movie?.image || '/images/MOVIEFROST.png'
  );

  const directorName = clean(movie?.director);
  const director = directorName
    ? {
      '@type': 'Person',
      name: directorName,
    }
    : undefined;

  const actors = Array.isArray(movie?.casts)
    ? movie.casts
      .map((c) => ({
        name: clean(c?.name),
        image: absoluteUrl(c?.image),
      }))
      .filter((c) => c.name)
      .slice(0, 30)
      .map((c) => ({
        '@type': 'Person',
        name: c.name,
        ...(c.image ? { image: c.image } : {}),
      }))
    : [];

  const aggregateRating = buildSiteAggregateRating(movie);

  const year = movie?.year ? Number(movie.year) : null;

  const episodes = Array.isArray(movie?.episodes) ? movie.episodes : [];
  const seasonSet = new Set(episodes.map((e) => Number(e?.seasonNumber || 1)));
  const numberOfSeasons = isSeries ? seasonSet.size || undefined : undefined;
  const numberOfEpisodes = isSeries ? episodes.length || undefined : undefined;

  const { additionalProperty, sameAs } = buildExternalRatingNodes(movie);

  const duration = minutesToIsoDuration(movie?.time);
  const hasTrailer = !!clean(movie?.trailerUrl);

  const node = {
    '@type': schemaType,
    '@id': canonical,
    name: clean(movie?.name || 'Movie'),
    url: canonical,
    image: image ? [image] : undefined,
    description: clean(movie?.seoDescription || movie?.desc || ''),
    datePublished: year ? `${year}-01-01` : undefined,
    inLanguage: clean(movie?.language || ''),
    genre: clean(movie?.category || ''),
    keywords: clean(movie?.seoKeywords || ''),
    duration: duration || undefined,
    isFamilyFriendly: true,

    ...(director ? { director } : {}),
    ...(actors.length ? { actor: actors } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),
    ...(sameAs.length ? { sameAs } : {}),

    ...(Number.isFinite(Number(movie?.viewCount))
      ? {
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: { '@type': 'WatchAction' },
            userInteractionCount: Number(movie.viewCount),
          },
        ],
      }
      : {}),

    ...(hasTrailer ? { trailer: { '@id': `${canonical}#trailer` } } : {}),

    potentialAction: {
      '@type': 'WatchAction',
      target: watchUrl(movie),
    },

    ...(isSeries && numberOfSeasons ? { numberOfSeasons } : {}),
    ...(isSeries && numberOfEpisodes ? { numberOfEpisodes } : {}),
  };

  return node;
};

/* ============================
   Heavy @graph for Movie page
   ============================ */
export const buildMovieGraphJsonLd = (movie) => {
  const canonical = movieCanonical(movie);

  const orgId = `${SITE_URL}#organization`;
  const websiteId = `${SITE_URL}#website`;
  const pageId = `${canonical}#webpage`;

  const breadcrumb = buildBreadcrumbJsonLd(movie);
  const movieNode = buildMovieJsonLd(movie);
  const faqNode = buildMovieFaqPageJsonLd(movie);
  const trailerNode = buildMovieTrailerVideoJsonLd(movie);

  const pageParts = [
    ...(faqNode ? [{ '@id': faqNode['@id'] }] : []),
    ...(trailerNode ? [{ '@id': trailerNode['@id'] }] : []),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'MovieFrost',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/images/MOVIEFROST.png'),
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: 'MovieFrost',
        publisher: { '@id': orgId },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/movies?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': pageId,
        url: canonical,
        name: buildMovieTitle(movie),
        isPartOf: { '@id': websiteId },
        about: { '@id': canonical },
        mainEntity: { '@id': canonical },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
        ...(pageParts.length ? { hasPart: pageParts } : {}),
      },
      breadcrumb,
      movieNode,
      ...(faqNode ? [faqNode] : []),
      ...(trailerNode ? [trailerNode] : []),
    ],
  };
};

/* ============================
   Actor page graph
   ============================ */
export const buildActorGraphJsonLd = ({ actor, movies = [] }) => {
  const slug = clean(actor?.slug);
  const name = clean(actor?.name || '');
  const url = actorCanonicalBySlug(slug);

  const orgId = `${SITE_URL}#organization`;
  const websiteId = `${SITE_URL}#website`;
  const pageId = `${url}#webpage`;

  const image = absoluteUrl(actor?.image || '/images/placeholder.jpg');

  const itemList = {
    '@type': 'ItemList',
    name: `${name} filmography`,
    itemListElement: (movies || []).slice(0, 50).map((m, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: movieCanonical(m),
    })),
  };

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: name || 'Actor', item: url },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'MovieFrost',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/images/MOVIEFROST.png'),
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: 'MovieFrost',
        publisher: { '@id': orgId },
      },
      {
        '@type': 'WebPage',
        '@id': pageId,
        url,
        name: `${name} — Movies & Web Series`,
        isPartOf: { '@id': websiteId },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      breadcrumb,
      {
        '@type': 'Person',
        '@id': url,
        name,
        url,
        ...(image ? { image } : {}),
      },
      itemList,
    ],
  };
};
