// frontend-next/src/lib/api.js
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend-flax.vercel.app';

// ✅ normalize: remove trailing slashes + accidental "/api"
const API_BASE = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/i, '');
const API = `${API_BASE}/api`;

/**
 * ✅ Cache tags used for On‑Demand Revalidation
 * Backend will call: POST https://www.moviefrost.com/revalidate
 */
export const CACHE_TAGS = {
  MOVIES: 'movies',
  HOME: 'home',
  CATEGORIES: 'categories',
  BROWSE_BY_DISTINCT: 'browseByDistinct',
  ACTORS: 'actors',
};

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const movieTag = (idOrSlug) => `movie:${String(idOrSlug || '').trim()}`;
const relatedTag = (idOrSlug) => `related:${String(idOrSlug || '').trim()}`;
const actorTag = (slug) => `actor:${String(slug || '').trim()}`;

const nextCache = (revalidate, tags = []) => ({
  next: { revalidate, tags: uniq(tags) },
});

async function fetchJson(url, init = {}, opts = {}) {
  const {
    nullOn404 = true,
    nullOn401 = false,
    nullOn403 = false,
    nullOn400MovieNotFound = true,
  } = opts;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text().catch(() => '');
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (nullOn404 && res.status === 404) return null;
  if (nullOn401 && res.status === 401) return null;
  if (nullOn403 && res.status === 403) return null;

  if (!res.ok) {
    const msg = data?.message || (typeof data === 'string' ? data : res.statusText);

    // ✅ backend sometimes returns 400 with "Movie not found"
    if (
      nullOn400MovieNotFound &&
      res.status === 400 &&
      /movie not found/i.test(String(msg || ''))
    ) {
      return null;
    }

    throw new Error(msg || `API error ${res.status}`);
  }

  return data;
}

export async function getCategories({ revalidate = 3600 } = {}) {
  return fetchJson(
    `${API}/categories`,
    nextCache(revalidate, [CACHE_TAGS.CATEGORIES])
  );
}

export async function getBrowseByDistinct({ revalidate = 3600 } = {}) {
  return fetchJson(
    `${API}/movies/browseBy-distinct`,
    nextCache(revalidate, [CACHE_TAGS.BROWSE_BY_DISTINCT])
  );
}

export async function getMovieBySlug(slug, { revalidate = 3600 } = {}) {
  const raw = String(slug || '').trim();
  const safe = encodeURIComponent(raw);
  if (!safe) return null;

  return fetchJson(
    `${API}/movies/${safe}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, movieTag(raw)])
  );
}

/* ============================================================
   ✅ Admin movie fetch (SSR can preview drafts)
   ============================================================ */
export async function getMovieBySlugAdmin(slug, token) {
  const raw = String(slug || '').trim();
  const safe = encodeURIComponent(raw);
  if (!safe || !token) return null;

  return fetchJson(
    `${API}/movies/admin/${safe}`,
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    },
    {
      nullOn404: true,
      nullOn401: true,
      nullOn403: true,
      nullOn400MovieNotFound: true,
    }
  );
}

export async function getMovies(query = {}, { revalidate = 60 } = {}) {
  const {
    type = '',
    category = '',
    time = '',
    language = '',
    rate = '',
    year = '',
    browseBy = '',
    search = '',
    pageNumber = 1,
  } = query;

  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (category) params.set('category', category);
  if (time) params.set('time', time);
  if (language) params.set('language', language);
  if (rate) params.set('rate', rate);
  if (year) params.set('year', year);
  if (browseBy) params.set('browseBy', browseBy);
  if (search) params.set('search', search);
  params.set('pageNumber', String(pageNumber || 1));

  // ✅ Tag all movie lists under "movies" so one invalidate updates everything
  return fetchJson(
    `${API}/movies?${params.toString()}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES])
  );
}

export async function getLatestNewMovies(limit = 100, { revalidate = 300 } = {}) {
  return fetchJson(
    `${API}/movies/latest-new?limit=${encodeURIComponent(limit)}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, CACHE_TAGS.HOME])
  );
}

export async function getBannerMovies(limit = 10, { revalidate = 300 } = {}) {
  return fetchJson(
    `${API}/movies/banner?limit=${encodeURIComponent(limit)}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, CACHE_TAGS.HOME])
  );
}

export async function getTopRatedMovies({ revalidate = 600 } = {}) {
  return fetchJson(
    `${API}/movies/rated/top`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, CACHE_TAGS.HOME])
  );
}

export async function getRelatedMovies(idOrSlug, limit = 20, { revalidate = 600 } = {}) {
  const raw = String(idOrSlug || '').trim();
  const safe = encodeURIComponent(raw);
  if (!safe) return [];
  const data = await fetchJson(
    `${API}/movies/related/${safe}?limit=${encodeURIComponent(limit)}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, relatedTag(raw)])
  );
  return Array.isArray(data) ? data : [];
}

/* ✅ Optional: admin related for draft previews */
export async function getRelatedMoviesAdmin(idOrSlug, token, limit = 20) {
  const raw = String(idOrSlug || '').trim();
  const safe = encodeURIComponent(raw);
  if (!safe || !token) return [];

  const data = await fetchJson(
    `${API}/movies/admin/related/${safe}?limit=${encodeURIComponent(limit)}`,
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    },
    { nullOn401: true, nullOn403: true, nullOn404: true }
  );

  return Array.isArray(data) ? data : [];
}

export async function getActorBySlug(slug, { revalidate = 30 } = {}) {
  const raw = String(slug || '').trim();
  const safe = encodeURIComponent(raw);
  if (!safe) return null;

  return fetchJson(
    `${API}/actors/${safe}`,
    nextCache(revalidate, [CACHE_TAGS.MOVIES, CACHE_TAGS.ACTORS, actorTag(raw)])
  );
}
