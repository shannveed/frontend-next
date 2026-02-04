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
   ✅ Title normalization helpers (NEW)
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

  // leading "Watch" / "Watch:"
  t = t.replace(/^(?:watch)\s*[:\-–—]?\s*/i, '');

  // trailing brand/seo junk if it ever exists in name
  t = t.replace(/\s*\|\s*moviefrost\s*$/i, '');

  // trailing phrases (only at the END)
  t = t.replace(
    /\s+(?:watch\s+online|online\s+free|full\s+movie|full\s+hd|download)\s*$/i,
    ''
  );

  return clean(t);
};

const isMarketingSegment = (seg = '') => {
  const s = clean(seg).toLowerCase();
  if (!s) return false;

  // strong “marketing” intent words
  if (/\bwatch\b/.test(s)) return true;
  if (/\bonline\b/.test(s)) return true;
  if (/\bdownload\b/.test(s)) return true;
  if (/\bstream(?:ing)?\b/.test(s)) return true;

  // "Full/HD/4K/1080p..." + "movie" combo
  const hasQuality = /\b(full|hd|4k|1080p|720p)\b/.test(s);
  const hasMovieWord = /\bmovie\b/.test(s);

  if (hasQuality && hasMovieWord) return true;

  // segment is literally "movie" or "full movie"
  if (/^(?:full\s+)?movie$/.test(s)) return true;

  return false;
};

// Remove trailing marketing chunks AFTER separators like: "Title - Full HD Movie"
const stripTrailingMarketingSegments = (raw = '') => {
  const t = clean(raw);
  if (!t) return '';

  // split only when the separator has spaces around it (to avoid breaking normal hyphenated words)
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

const buildMovieNameWithYear = (movie) => {
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

    const needed = yearSuffix.length + 1; // space + year
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
  { maxLen = 60, prefix = 'Watch ', suffix = ' Online Free' } = {}
) => {
  const p = String(prefix);
  const suf = String(suffix);

  const nameMax = Math.max(10, maxLen - p.length - suf.length); // safety floor
  const clippedName = clampNameKeepTrailingYear(nameWithYear, nameMax);

  return clean(`${p}${clippedName}${suf}`);
};

/* ============================
   Titles / descriptions
   ============================ */

/**
 * ✅ FIXED:
 * - does NOT use seoTitle (prevents long marketing titles)
 * - ensures year appears only once
 * - clamps to safe length
 * - always produces: "Watch <Name (Year)> Online Free"
 */
export const buildMovieTitle = (movie, { maxLen = 60 } = {}) => {
  const nameWithYear = buildMovieNameWithYear(movie);
  return buildPatternTitle(nameWithYear, { maxLen });
};

export const buildMovieDescription = (movie) => {
  // ✅ also avoid "(2026) (2026)" duplication in descriptions
  const nameWithYear = buildMovieNameWithYear(movie);

  const base = `${nameWithYear} — watch online free in HD on MovieFrost.`;
  const extra = ` Plot, cast, release year and more.`;

  return truncate(movie?.seoDescription || `${base}${extra}`, 160);
};

/* ============================
   Breadcrumb
   ============================ */
export const buildBreadcrumbJsonLd = (movie) => {
  const canonical = movieCanonical(movie);

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
        name: clean(movie?.name || 'Movie'),
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
 * ✅ IMPORTANT SEO FIX:
 * We DO NOT output third‑party ratings as schema.org "Review" objects.
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
   Movie/TVSeries node (rich)
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
        url: actorCanonicalByName(directorName),
      }
    : undefined;

  const actors = Array.isArray(movie?.casts)
    ? movie.casts
        .map((c) => ({
          name: clean(c?.name),
          slug: clean(c?.slug) || personSlug(c?.name),
          image: absoluteUrl(c?.image),
        }))
        .filter((c) => c.name)
        .slice(0, 30)
        .map((c) => ({
          '@type': 'Person',
          name: c.name,
          url: actorCanonicalBySlug(c.slug),
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

  const movieNode = buildMovieJsonLd(movie);
  const breadcrumb = buildBreadcrumbJsonLd(movie);

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
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
      },
      breadcrumb,
      movieNode,
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
