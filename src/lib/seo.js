// src/lib/seo.js
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com')
  .replace(/\/+$/, '');

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
export const actorCanonicalByName = (name) => actorCanonicalBySlug(personSlug(name));

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

// /watch is canonical to itself (your choice)
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
      { '@type': 'ListItem', position: 2, name: 'Movies', item: `${SITE_URL}/movies` },
      { '@type': 'ListItem', position: 3, name: clean(movie?.name || 'Movie'), item: canonical },
    ],
  };
};

const asNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};


const buildExternalRatingNodes = (movie) => {
  const imdb = movie?.externalRatings?.imdb || {};
  const rt = movie?.externalRatings?.rottenTomatoes || {};

  // 1. EXTRACT RATINGS FIRST (using the fixed asNumber)
  const imdbRating = asNumber(imdb.rating);
  const rtRating = asNumber(rt.rating);

  // 2. CHECK VISIBILITY (Strict null checks)
  const showImdb = imdbRating !== null;
  const showRt = rtRating !== null;

  const imdbVotes = asNumber(imdb.votes);
  const imdbUrl = clean(imdb.url) || (movie?.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : '');

  const rtUrl = clean(rt.url) || (movie?.name ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.name)}` : '');

  // Visible-on-page safe fields
  const additionalProperty = [];

  // 3. USE THE STRICT FLAGS
  if (showImdb) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'IMDb rating',
      value: imdbVotes ? `${imdbRating}/10 (${imdbVotes} votes)` : `${imdbRating}/10`,
      url: imdbUrl || undefined,
    });
  }

  if (showRt) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Rotten Tomatoes',
      value: `${rtRating}%`,
      url: rtUrl || undefined,
    });
  }

  // Optional: also express as “critic reviews”
  const reviews = [];
  if (showImdb) {
    reviews.push({
      '@type': 'Review',
      name: 'IMDb user rating',
      reviewBody: `IMDb users rated this title ${imdbRating}/10.`,
      author: { '@type': 'Organization', name: 'IMDb' },
      publisher: { '@type': 'Organization', name: 'IMDb' },
      url: imdbUrl || undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: imdbRating,
        bestRating: '10',
        worstRating: '1',
      },
    });
  }

  if (showRt) {
    reviews.push({
      '@type': 'Review',
      name: 'Rotten Tomatoes score',
      reviewBody: `Rotten Tomatoes score: ${rtRating}%.`,
      author: { '@type': 'Organization', name: 'Rotten Tomatoes' },
      publisher: { '@type': 'Organization', name: 'Rotten Tomatoes' },
      url: rtUrl || undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rtRating,
        bestRating: '100',
        worstRating: '0',
      },
    });
  }

  return { additionalProperty, reviews };
};

/* ============================
   Movie/TVSeries node (rich)
   ============================ */
export const buildMovieJsonLd = (movie) => {
  const canonical = movieCanonical(movie);
  const isSeries = movie?.type === 'WebSeries';

  const schemaType = isSeries ? 'TVSeries' : 'Movie';

  const image = absoluteUrl(movie?.titleImage || movie?.image || '/images/MOVIEFROST.png');

  const directorName = clean(movie?.director);
  const director =
    directorName
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

  // MovieFrost rating (your site)
  const aggregateRating =
    typeof movie?.numberOfReviews === 'number' && movie.numberOfReviews > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(movie?.rate || 0).toFixed(1),
          reviewCount: movie.numberOfReviews,
          bestRating: '5',
          worstRating: '0',
        }
      : undefined;

  const year = movie?.year ? Number(movie.year) : null;

  // WebSeries counts (optional but useful)
  const episodes = Array.isArray(movie?.episodes) ? movie.episodes : [];
  const seasonSet = new Set(episodes.map((e) => Number(e?.seasonNumber || 1)));
  const numberOfSeasons = isSeries ? seasonSet.size || undefined : undefined;
  const numberOfEpisodes = isSeries ? episodes.length || undefined : undefined;

  const { additionalProperty, reviews } = buildExternalRatingNodes(movie);

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
    duration: movie?.time ? `PT${Number(movie.time)}M` : undefined,
    isFamilyFriendly: true,

    ...(director ? { director } : {}),
    ...(actors.length ? { actor: actors } : {}),

    ...(aggregateRating ? { aggregateRating } : {}),

    ...(reviews.length ? { review: reviews } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),

    // Engagement (helps SEO graph completeness; no rich result guarantee)
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

    // Watch action
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
