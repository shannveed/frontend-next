// frontend-next/src/lib/seo.js

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com'
).replace(/\/+$/, '');

export const BRAND_NAME = 'MovieFrost';

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
   Movie title/meta helpers
   Q1 SEO update:
   - move away from spammy "Full Movie Online Free HD Streaming"
   - turn pages into high-quality movie detail pages
   ============================================================ */

const SPAMMY_SEO_PATTERNS = [
  /\bfull\s+movie\b/i,
  /\bonline\s+free\b/i,
  /\bhd\s+stream(?:ing)?\b/i,
  /\bwatch\b.*\bonline\b/i,
  /\bwatch\s+online\b/i,
  /\bfree\s+stream(?:ing)?\b/i,
  /\bstream(?:ing)?\s+now\b/i,
  /\bdownload\s+now\b/i,
];

const DETAIL_TITLE_SUFFIXES_MOVIE_WITH_TRAILER = [
  ` | Cast, Plot, Trailer & Streaming Info | ${BRAND_NAME}`,
  ` | Plot, Cast & Trailer | ${BRAND_NAME}`,
  ` | Cast & Trailer | ${BRAND_NAME}`,
  ` | ${BRAND_NAME}`,
];

const DETAIL_TITLE_SUFFIXES_MOVIE_NO_TRAILER = [
  ` | Cast, Plot & Streaming Info | ${BRAND_NAME}`,
  ` | Plot & Cast | ${BRAND_NAME}`,
  ` | Cast Info | ${BRAND_NAME}`,
  ` | ${BRAND_NAME}`,
];

const DETAIL_TITLE_SUFFIXES_SERIES_WITH_TRAILER = [
  ` | Cast, Episodes, Trailer & Streaming Info | ${BRAND_NAME}`,
  ` | Episodes, Cast & Trailer | ${BRAND_NAME}`,
  ` | Cast & Trailer | ${BRAND_NAME}`,
  ` | ${BRAND_NAME}`,
];

const DETAIL_TITLE_SUFFIXES_SERIES_NO_TRAILER = [
  ` | Cast, Episodes & Streaming Info | ${BRAND_NAME}`,
  ` | Episodes & Cast | ${BRAND_NAME}`,
  ` | Cast Info | ${BRAND_NAME}`,
  ` | ${BRAND_NAME}`,
];

const TITLE_MIN_VISIBLE_NAME_CHARS = 18;

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

const joinHumanList = (items = []) => {
  const list = (items || []).map(clean).filter(Boolean);

  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;

  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
};

const looksSpammySeoText = (text = '') => {
  const s = clean(text);
  if (!s) return false;
  return SPAMMY_SEO_PATTERNS.some((re) => re.test(s));
};

const isMirrorOrPrefixOfBaseText = (candidate = '', base = '') => {
  const a = clean(candidate).toLowerCase();
  const b = clean(base).toLowerCase();

  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
};

const asNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const hasPositiveNumber = (v) => {
  const n = asNumber(v);
  return n !== null && n > 0;
};

// Future-proof: if you ever add official/licensed stream support,
// movie pages can switch to "Watch X | MovieFrost"
const isLicensedStreamMovie = (movie) => {
  if (!movie || typeof movie !== 'object') return false;

  if (movie.isLicensedStream === true) return true;

  const streamingMode = clean(movie.streamingMode).toLowerCase();
  const streamingProvider = clean(movie.streamingProvider).toLowerCase();

  return streamingMode === 'official' || streamingProvider === 'official';
};

const getDetailTitleSuffixes = (movie) => {
  const isSeries = movie?.type === 'WebSeries';
  const hasTrailer = !!clean(movie?.trailerUrl);

  if (isSeries) {
    return hasTrailer
      ? DETAIL_TITLE_SUFFIXES_SERIES_WITH_TRAILER
      : DETAIL_TITLE_SUFFIXES_SERIES_NO_TRAILER;
  }

  return hasTrailer
    ? DETAIL_TITLE_SUFFIXES_MOVIE_WITH_TRAILER
    : DETAIL_TITLE_SUFFIXES_MOVIE_NO_TRAILER;
};

const pickAdaptiveSuffix = (nameWithYear, suffixes, maxLen) => {
  const list =
    Array.isArray(suffixes) && suffixes.length
      ? suffixes
      : [` | ${BRAND_NAME}`];

  const nameLen = clean(nameWithYear).length;

  for (const suffix of list) {
    const nameBudget = maxLen - String(suffix).length;

    // Best case: full name fits with this suffix
    if (nameBudget >= nameLen) return suffix;

    // Otherwise allow if enough of the title can still remain visible
    if (nameBudget >= TITLE_MIN_VISIBLE_NAME_CHARS) return suffix;
  }

  return list[list.length - 1];
};

const buildGeneratedLicensedTitle = (movie, maxLen = 60) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  return buildPatternTitle(nameWithYear, {
    maxLen,
    prefix: 'Watch ',
    suffix: ` | ${BRAND_NAME}`,
  });
};

const buildGeneratedDetailTitle = (movie, maxLen = 60) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  const suffix = pickAdaptiveSuffix(
    nameWithYear,
    getDetailTitleSuffixes(movie),
    maxLen
  );

  return buildPatternTitle(nameWithYear, {
    maxLen,
    suffix,
  });
};

/* ============================
   Titles / descriptions
   ============================ */

// Movie detail page title
export const buildMovieTitle = (movie, { maxLen = 60 } = {}) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  if (!nameWithYear) return BRAND_NAME;

  return isLicensedStreamMovie(movie)
    ? buildGeneratedLicensedTitle(movie, maxLen)
    : buildGeneratedDetailTitle(movie, maxLen);
};

// Watch page title (keep watch intent for /watch, while /movie stays detail-style)
export const buildWatchPageTitle = (movie, { maxLen = 60 } = {}) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  if (!nameWithYear) return `Watch | ${BRAND_NAME}`;

  return buildGeneratedLicensedTitle(movie, maxLen);
};

// Keep custom seoDescription only if it looks intentional and not spammy.
// If it's just a mirrored copy of desc or contains spammy phrases, ignore it.
const getTrustedCustomSeoDescription = (movie) => {
  const custom = clean(movie?.seoDescription);
  if (!custom) return '';

  if (looksSpammySeoText(custom)) return '';
  if (isMirrorOrPrefixOfBaseText(custom, movie?.desc)) return '';

  return truncate(custom, 160);
};

const buildGeneratedLicensedDescription = (movie) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  const isSeries = movie?.type === 'WebSeries';
  const genre = clean(movie?.category);
  const director = clean(movie?.director);
  const hasTrailer = !!clean(movie?.trailerUrl);
  const episodeCount = Array.isArray(movie?.episodes) ? movie.episodes.length : 0;

  const introBits = [];
  if (genre) introBits.push(`${genre} ${isSeries ? 'series' : 'film'}`);
  else introBits.push(isSeries ? 'series' : 'film');
  if (director) introBits.push(`directed by ${director}`);

  const intro = `Stream ${nameWithYear}${introBits.length ? `, a ${introBits.join(' ')}` : ''
    }.`;

  const detailItems = ['cast', isSeries ? 'story' : 'synopsis'];
  if (isSeries && episodeCount > 0) detailItems.push('episodes');
  if (hasPositiveNumber(movie?.time)) {
    detailItems.push(isSeries ? 'episode runtime' : 'runtime');
  }
  if (hasTrailer) detailItems.push('trailer');
  detailItems.push('streaming details');

  return truncate(
    `${intro} Explore the ${joinHumanList(detailItems)} on ${BRAND_NAME}.`,
    160
  );
};

const buildGeneratedDetailDescription = (movie) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  const isSeries = movie?.type === 'WebSeries';
  const genre = clean(movie?.category);
  const director = clean(movie?.director);
  const hasTrailer = !!clean(movie?.trailerUrl);
  const episodeCount = Array.isArray(movie?.episodes) ? movie.episodes.length : 0;

  const introBits = [];
  if (genre) introBits.push(`${genre} ${isSeries ? 'series' : 'film'}`);
  else introBits.push(isSeries ? 'web series' : 'movie');
  if (director) introBits.push(`directed by ${director}`);

  const intro = `${nameWithYear} — ${introBits.join(' ')}.`;

  const detailItems = ['cast', isSeries ? 'story' : 'synopsis'];
  if (isSeries && episodeCount > 0) detailItems.push('episodes');
  if (hasPositiveNumber(movie?.time)) {
    detailItems.push(isSeries ? 'episode runtime' : 'runtime');
  }
  if (hasTrailer) detailItems.push('trailer');
  detailItems.push('viewing options');

  return truncate(
    `${intro} Explore the ${joinHumanList(detailItems)} on ${BRAND_NAME}.`,
    160
  );
};

export const buildMovieDescription = (movie) => {
  const custom = getTrustedCustomSeoDescription(movie);
  if (custom) return custom;

  return isLicensedStreamMovie(movie)
    ? buildGeneratedLicensedDescription(movie)
    : buildGeneratedDetailDescription(movie);
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
  const isSeries = movie?.type === 'WebSeries';
  const episodeCount = Array.isArray(movie?.episodes) ? movie.episodes.length : 0;

  const trailerContextItems = ['cast', isSeries ? 'story' : 'synopsis'];
  if (isSeries && episodeCount > 0) trailerContextItems.push('episodes');
  if (hasPositiveNumber(movie?.time)) {
    trailerContextItems.push(isSeries ? 'episode runtime' : 'runtime');
  }
  trailerContextItems.push('viewing options');

  return {
    '@type': 'VideoObject',
    '@id': `${canonical}#trailer`,
    name: `${buildMovieNameWithYear(movie)} Trailer`,
    description: truncate(
      `${buildMovieNameWithYear(
        movie
      )} trailer on ${BRAND_NAME}. Explore the ${joinHumanList(
        trailerContextItems
      )}.`,
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
    description: buildMovieDescription(movie),
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
        name: BRAND_NAME,
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
        name: BRAND_NAME,
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
        name: BRAND_NAME,
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
        name: BRAND_NAME,
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
