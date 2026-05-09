// frontend-next/middleware.js
import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'https://moviefrost-backend-ten.vercel.app';
const DEFAULT_ENGLISH_ORIGIN = 'https://www.moviefrost.com';
const DEFAULT_HINDI_ORIGIN = 'https://hi.moviefrost.com';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function clean(value = '') {
  return String(value ?? '').trim();
}

function normalizeOrigin(value = '', fallback = '') {
  let next = clean(value || fallback);

  if (!next) return '';

  if (!/^https?:\/\//i.test(next)) {
    if (/^(localhost|127\.0\.0\.1|hi\.localhost)(:\d+)?/i.test(next)) {
      next = `http://${next.replace(/^\/+/, '')}`;
    } else {
      next = `https://${next.replace(/^\/+/, '')}`;
    }
  }

  return next.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function normalizeHindiOrigin(value = '', fallback = DEFAULT_HINDI_ORIGIN) {
  const origin = normalizeOrigin(value, fallback);

  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();

    // Fix common typo: https://wwwhi.moviefrost.com
    if (host === 'wwwhi.moviefrost.com' || host === 'www.hi.moviefrost.com') {
      u.hostname = 'hi.moviefrost.com';
    }

    return u.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_HINDI_ORIGIN;
  }
}

function hostnameOf(origin = '') {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isLocalHostname(hostname = '') {
  const host = clean(hostname).toLowerCase();

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'hi.localhost' ||
    host.endsWith('.localhost')
  );
}

function isLocalOrigin(origin = '') {
  return isLocalHostname(hostnameOf(origin));
}

const RAW_API_BASE =
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE;

const ENGLISH_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_ENGLISH_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  DEFAULT_ENGLISH_ORIGIN,
  DEFAULT_ENGLISH_ORIGIN
);

const HINDI_ORIGIN = normalizeHindiOrigin(
  process.env.NEXT_PUBLIC_HINDI_SITE_URL || DEFAULT_HINDI_ORIGIN,
  DEFAULT_HINDI_ORIGIN
);

const ENABLE_REDIRECT =
  String(process.env.NEXT_PUBLIC_ENABLE_HINDI_LANGUAGE_REDIRECT ?? 'true')
    .trim()
    .toLowerCase() !== 'false';

const ENABLE_LOCAL_REDIRECT =
  String(process.env.NEXT_PUBLIC_ENABLE_HINDI_REDIRECT_LOCAL || '')
    .trim()
    .toLowerCase() === 'true';

const DEBUG_REDIRECT =
  String(process.env.NEXT_PUBLIC_HINDI_REDIRECT_DEBUG || '')
    .trim()
    .toLowerCase() === 'true';

const FETCH_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.HINDI_REDIRECT_FETCH_TIMEOUT_MS || 3500), 700),
  9000
);

const API_BASE_CANDIDATES = (() => {
  const rawList = [
    RAW_API_BASE,
    process.env.BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_API_BASE,

    // Safe fallback for old deployments/env mistakes.
    'https://moviefrost-backend-ten.vercel.app',
    'https://moviefrost-backend-peach.vercel.app',
  ];

  const out = [];
  const seen = new Set();

  for (const raw of rawList) {
    const origin = normalizeOrigin(raw, '');

    if (!origin) continue;

    // Never try localhost from Vercel Edge production.
    if (IS_PRODUCTION && isLocalOrigin(origin)) continue;

    const key = origin.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(origin);
  }

  return out;
})();

const INDIAN_LANGUAGE_WORDS = [
  'Hindi',
  'Hindi Dubbed',
  'Punjabi',
  'Urdu',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Marathi',
];

const INDIAN_CONTENT_MARKERS = [
  'Hindi',
  'Hindi Dubbed',
  'Bollywood',
  'South Indian',
  'Indian Punjabi',
  'Punjabi',
  'Urdu',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Marathi',
];

function normalizeLanguageKey(value = '') {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDIAN_LANGUAGE_KEYS = INDIAN_LANGUAGE_WORDS.map(normalizeLanguageKey).filter(
  Boolean
);

const INDIAN_CONTENT_KEYS = INDIAN_CONTENT_MARKERS.map(normalizeLanguageKey).filter(
  Boolean
);

function textContainsNormalizedToken(text = '', keys = []) {
  const normalized = normalizeLanguageKey(text);
  if (!normalized) return false;

  const padded = ` ${normalized} `;
  const compact = normalized.replace(/\s+/g, '');

  return keys.some((key) => {
    const cleanKey = normalizeLanguageKey(key);
    if (!cleanKey) return false;

    const keyCompact = cleanKey.replace(/\s+/g, '');

    return padded.includes(` ${cleanKey} `) || compact.includes(keyCompact);
  });
}

function movieHasIndianLanguage(movie) {
  // Important:
  // Do not rely only on `language`.
  // Many Hindi-dubbed rows have "English" language but Hindi marker in name/slug/browseBy.
  const languageText = [movie?.language].join(' ');
  const allSearchableText = [
    movie?.language,
    movie?.browseBy,
    movie?.name,
    movie?.slug,
    movie?.category,
    movie?.thumbnailInfo,
  ].join(' ');

  return (
    textContainsNormalizedToken(languageText, INDIAN_LANGUAGE_KEYS) ||
    textContainsNormalizedToken(allSearchableText, INDIAN_CONTENT_KEYS)
  );
}

function shouldRedirectFromHost(currentHostname = '') {
  const current = clean(currentHostname).toLowerCase();

  if (!current) return false;

  const hindiHost = hostnameOf(HINDI_ORIGIN);
  const englishHost = hostnameOf(ENGLISH_ORIGIN);

  // Already on Hindi domain: never redirect again.
  if (
    current === hindiHost ||
    current === 'hi.moviefrost.com' ||
    current === 'www.hi.moviefrost.com' ||
    current === 'wwwhi.moviefrost.com'
  ) {
    return false;
  }

  // Local redirect is opt-in.
  if (isLocalHostname(current)) {
    return ENABLE_LOCAL_REDIRECT;
  }

  return (
    current === englishHost ||
    current === 'www.moviefrost.com' ||
    current === 'moviefrost.com'
  );
}

function getRedirectStatus() {
  const raw = clean(process.env.NEXT_PUBLIC_HINDI_REDIRECT_STATUS);
  const n = Number(raw);

  if ([301, 302, 307, 308].includes(n)) return n;

  return IS_PRODUCTION ? 308 : 307;
}

function getMovieSlugFromPathname(pathname = '') {
  const raw = String(pathname || '')
    .replace(/^\/movie\/+/, '')
    .split('/')[0];

  if (!raw) return '';

  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function buildRedirectInfoUrls(slug, req) {
  const safe = encodeURIComponent(clean(slug));
  if (!safe) return [];

  const urls = [];

  for (const base of API_BASE_CANDIDATES) {
    urls.push(`${base}/api/movies/redirect-info/${safe}`);
  }

  // Fallback through Next rewrite:
  // /api/:path* -> backend, from next.config.js
  try {
    urls.push(new URL(`/api/movies/redirect-info/${safe}`, req.url).toString());
  } catch {
    // ignore
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-MovieFrost-Middleware': 'hindi-language-redirect',
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
      };
    }

    const data = await res.json().catch(() => null);

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        error?.name === 'AbortError'
          ? 'timeout'
          : String(error?.message || error || 'fetch_failed'),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMovieRedirectInfo(slug, req) {
  const urls = buildRedirectInfoUrls(slug, req);

  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchJsonWithTimeout(url);

    if (result.ok && result.data) {
      return result.data;
    }

    if (DEBUG_REDIRECT) {
      console.warn('[hindi-redirect] lookup failed:', {
        url,
        status: result.status,
        error: result.error || '',
      });
    }
  }

  return null;
}

function nextWithDebug(reason = '') {
  const res = NextResponse.next();

  if (DEBUG_REDIRECT && reason) {
    res.headers.set('X-MF-Hindi-Redirect', reason);
  }

  return res;
}

export async function middleware(req) {
  if (!ENABLE_REDIRECT) {
    return nextWithDebug('disabled');
  }

  const { nextUrl } = req;
  const pathname = nextUrl.pathname || '';

  if (!pathname.startsWith('/movie/')) {
    return nextWithDebug('not-movie-path');
  }

  if (!shouldRedirectFromHost(nextUrl.hostname)) {
    return nextWithDebug('host-not-eligible');
  }

  const slug = getMovieSlugFromPathname(pathname);

  if (!slug) {
    return nextWithDebug('missing-slug');
  }

  const movie = await fetchMovieRedirectInfo(slug, req);

  if (!movie) {
    return nextWithDebug('movie-lookup-failed');
  }

  if (!movieHasIndianLanguage(movie)) {
    return nextWithDebug(
      `non-indian-content:${clean(
        [
          movie?.language,
          movie?.browseBy,
          movie?.name,
          movie?.slug,
          movie?.category,
        ].join('|')
      )}`
    );
  }

  const canonicalSeg = clean(movie.slug) || slug;

  if (!canonicalSeg) {
    return nextWithDebug('missing-canonical-segment');
  }

  const target = new URL(HINDI_ORIGIN);
  target.pathname = `/movie/${encodeURIComponent(canonicalSeg)}`;
  target.search = nextUrl.search;

  const res = NextResponse.redirect(target, {
    status: getRedirectStatus(),
  });

  if (DEBUG_REDIRECT) {
    res.headers.set('X-MF-Hindi-Redirect', 'redirected');
    res.headers.set('X-MF-Hindi-Language', clean(movie?.language));
    res.headers.set('X-MF-Hindi-BrowseBy', clean(movie?.browseBy));
  }

  return res;
}

export const config = {
  matcher: ['/movie/:path*'],
};
