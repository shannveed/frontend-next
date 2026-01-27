// src/lib/api.js
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend.vercel.app';

// ✅ normalize: remove trailing slashes + accidental "/api"
const API_BASE = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/i, '');

const API = `${API_BASE}/api`;

async function fetchJson(url, init = {}) {
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

  if (res.status === 404) return null;

  if (!res.ok) {
    const msg =
      data?.message || (typeof data === 'string' ? data : res.statusText);

    // ✅ backend currently returns 400 with "Movie not found"
    if (res.status === 400 && /movie not found/i.test(String(msg || ''))) {
      return null;
    }

    throw new Error(msg || `API error ${res.status}`);
  }

  return data;
}

export async function getCategories({ revalidate = 3600 } = {}) {
  return fetchJson(`${API}/categories`, { next: { revalidate } });
}

export async function getBrowseByDistinct({ revalidate = 3600 } = {}) {
  return fetchJson(`${API}/movies/browseBy-distinct`, { next: { revalidate } });
}

export async function getMovieBySlug(slug, { revalidate = 3600 } = {}) {
  const safe = encodeURIComponent(String(slug || '').trim());
  if (!safe) return null;
  return fetchJson(`${API}/movies/${safe}`, { next: { revalidate } });
}

export async function getMovies(query = {}, { revalidate = 60 } = {}) {
  const {
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
  if (category) params.set('category', category);
  if (time) params.set('time', time);
  if (language) params.set('language', language);
  if (rate) params.set('rate', rate);
  if (year) params.set('year', year);
  if (browseBy) params.set('browseBy', browseBy);
  if (search) params.set('search', search);
  params.set('pageNumber', String(pageNumber || 1));

  return fetchJson(`${API}/movies?${params.toString()}`, {
    next: { revalidate },
  });
}

export async function getLatestNewMovies(limit = 100, { revalidate = 300 } = {}) {
  return fetchJson(`${API}/movies/latest-new?limit=${encodeURIComponent(limit)}`, {
    next: { revalidate },
  });
}

export async function getBannerMovies(limit = 10, { revalidate = 300 } = {}) {
  return fetchJson(`${API}/movies/banner?limit=${encodeURIComponent(limit)}`, {
    next: { revalidate },
  });
}

export async function getTopRatedMovies({ revalidate = 600 } = {}) {
  return fetchJson(`${API}/movies/rated/top`, { next: { revalidate } });
}

export async function getRelatedMovies(idOrSlug, limit = 20, { revalidate = 600 } = {}) {
  const safe = encodeURIComponent(String(idOrSlug || '').trim());
  if (!safe) return [];
  return fetchJson(`${API}/movies/related/${safe}?limit=${encodeURIComponent(limit)}`, {
    next: { revalidate },
  });
}
