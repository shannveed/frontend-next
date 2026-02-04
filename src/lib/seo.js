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

/* ============================
   Titles / descriptions
   ============================ */
export const buildMovieTitle = (movie) => {
  const name = clean(movie?.seoTitle || movie?.name || 'Movie');
  const year = movie?.year ? ` (${movie.year})` : '';
  return `Watch ${name}${year} Online Free`;
};

export const buildMovieDescription = (movie) => {
  const name = clean(movie?.name || 'Movie');
  const year = movie?.year ? ` (${movie.year})` : '';
  const base = `${name}${year} — watch online free in HD on MovieFrost.`;
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

  // fallback (shouldn’t happen but safe)
  if (out === 'PT') out = `PT${Math.round(n)}M`;

  return out;
};

/**
 * ✅ IMPORTANT SEO FIX:
 * We DO NOT output third‑party ratings as schema.org "Review" objects.
 * Google’s review snippet rules are strict, and your current markup triggers:
 * "Multiple reviews without aggregateRating".
 *
 * Instead, we expose external ratings only as:
 * - sameAs (links)
 * - additionalProperty (informational)
 */
const buildExternalRatingNodes = (movie) => {
  const imdb = movie?.externalRatings?.imdb || {};
  const rt = movie?.externalRatings?.rottenTomatoes || {};

  const imdbRating = asNumber(imdb.rating); // 0..10
  const imdbVotes = asNumber(imdb.votes);
  const imdbUrl =
    clean(imdb.url) ||
    (movie?.imdbId ? `https://www.imdb.com/title/${clean(movie.imdbId)}/` : '');

  const rtRating = asNumber(rt.rating); // 0..100
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
 * - Only include when count >= 1 and avg > 0
 * - Keeps Google Review Snippet markup valid
 */
const buildSiteAggregateRating = (movie) => {
  const count = asNumber(movie?.numberOfReviews);
  const avg = asNumber(movie?.rate);

  if (!count || count < 1) return null;
  if (avg === null || avg <= 0) return null;

  // Clamp just in case legacy 0..5 data exists
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

  // WebSeries counts (optional)
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
