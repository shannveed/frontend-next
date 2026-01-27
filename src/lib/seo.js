// src/lib/seo.js
export const normalizeSiteUrl = (raw, fallback = 'https://www.moviefrost.com') => {
  const v = String(raw || '').trim().replace(/\/+$/, '');

  if (!v) return fallback;

  // already absolute
  if (/^https?:\/\//i.test(v)) return v;

  // if user provided "www.domain.com" or "domain.com"
  return `https://${v.replace(/^\/+/, '')}`;
};

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

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

export const movieCanonical = (movie) => {
  const seg = clean(movie?.slug) || String(movie?._id || '');
  return `${SITE_URL}/movie/${seg}`;
};

export const watchUrl = (movie) => {
  const seg = clean(movie?.slug) || String(movie?._id || '');
  return `${SITE_URL}/watch/${seg}`;
};

export const watchCanonical = (movie) => watchUrl(movie);

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

export const buildBreadcrumbJsonLd = (movie) => {
  const canonical = movieCanonical(movie);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Movies', item: `${SITE_URL}/movies` },
      { '@type': 'ListItem', position: 3, name: clean(movie?.name || 'Movie'), item: canonical }
    ]
  };
};

export const buildMovieJsonLd = (movie) => {
  const canonical = movieCanonical(movie);

  const actors = Array.isArray(movie?.casts)
    ? movie.casts
        .map((c) => clean(c?.name))
        .filter(Boolean)
        .slice(0, 20)
        .map((name) => ({ '@type': 'Person', name }))
    : [];

  const directorName = clean(movie?.director);
  const image = absoluteUrl(movie?.titleImage || movie?.image || '/images/MOVIEFROST.png');

  const aggregateRating =
    typeof movie?.numberOfReviews === 'number' && movie.numberOfReviews > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(movie?.rate || 0).toFixed(1),
          reviewCount: movie.numberOfReviews,
          bestRating: '5',
          worstRating: '0'
        }
      : undefined;

  const year = movie?.year ? Number(movie.year) : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: clean(movie?.name || 'Movie'),
    url: canonical,
    image: image ? [image] : undefined,
    description: clean(movie?.seoDescription || movie?.desc || ''),
    datePublished: year ? `${year}-01-01` : undefined,
    inLanguage: clean(movie?.language || ''),
    genre: clean(movie?.category || ''),
    duration: movie?.time ? `PT${Number(movie.time)}M` : undefined,
    ...(directorName ? { director: { '@type': 'Person', name: directorName } } : {}),
    ...(actors.length ? { actor: actors } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    potentialAction: { '@type': 'WatchAction', target: watchUrl(movie) }
  };
};
1