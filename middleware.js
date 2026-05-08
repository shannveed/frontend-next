// frontend-next/middleware.js
import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'https://moviefrost-backend-peach.vercel.app';
const DEFAULT_ENGLISH_ORIGIN = 'https://www.moviefrost.com';
const DEFAULT_HINDI_ORIGIN = 'https://hi.moviefrost.com';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;

const ENGLISH_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_ENGLISH_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  DEFAULT_ENGLISH_ORIGIN,
  DEFAULT_ENGLISH_ORIGIN
);

const HINDI_ORIGIN = normalizeOrigin(
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

const API_BASE = normalizeOrigin(RAW_API_BASE, DEFAULT_API_BASE).replace(
  /\/api$/i,
  ''
);

const INDIAN_LANGUAGES = [
  'Hindi',
  'Punjabi',
  'Urdu',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Marathi',
];

const INDIAN_LANGUAGE_RE = new RegExp(
  `(^|[^a-z])(${INDIAN_LANGUAGES.map(escapeRegex).join('|')})([^a-z]|$)`,
  'i'
);

function clean(value = '') {
  return String(value ?? '').trim();
}

function normalizeOrigin(value = '', fallback = '') {
  let next = clean(value || fallback);

  if (!next) return '';

  if (!/^https?:\/\//i.test(next)) {
    next = `https://${next.replace(/^\/+/, '')}`;
  }

  return next.replace(/\/+$/, '');
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
    host.endsWith('.localhost')
  );
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function movieHasIndianLanguage(movie) {
  const language = clean(movie?.language);

  if (!language) return false;

  return INDIAN_LANGUAGE_RE.test(language);
}

function shouldRedirectFromHost(currentHostname = '') {
  const current = clean(currentHostname).toLowerCase();

  if (!current) return false;

  const hindiHost = hostnameOf(HINDI_ORIGIN);
  const englishHost = hostnameOf(ENGLISH_ORIGIN);

  // Already on Hindi domain: never redirect again.
  if (hindiHost && current === hindiHost) return false;

  // Local redirect is opt-in so normal localhost dev is not disturbed.
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

  // Production: SEO-friendly permanent redirect.
  // Local/dev: temporary redirect to avoid browser caching during testing.
  return process.env.NODE_ENV === 'production' ? 308 : 307;
}

async function fetchMovieRedirectInfo(slug) {
  const safe = encodeURIComponent(clean(slug));

  if (!safe) return null;

  const url = `${API_BASE}/api/movies/redirect-info/${safe}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

export async function middleware(req) {
  if (!ENABLE_REDIRECT) return NextResponse.next();

  const { nextUrl } = req;
  const pathname = nextUrl.pathname || '';

  if (!pathname.startsWith('/movie/')) {
    return NextResponse.next();
  }

  const currentHostname = nextUrl.hostname;

  if (!shouldRedirectFromHost(currentHostname)) {
    return NextResponse.next();
  }

  const slug = decodeURIComponent(
    pathname.replace(/^\/movie\/+/, '').split('/')[0] || ''
  ).trim();

  if (!slug) return NextResponse.next();

  const movie = await fetchMovieRedirectInfo(slug);

  if (!movie || !movieHasIndianLanguage(movie)) {
    return NextResponse.next();
  }

  const canonicalSeg = clean(movie.slug) || slug;

  const target = new URL(HINDI_ORIGIN);
  target.pathname = `/movie/${canonicalSeg}`;
  target.search = nextUrl.search;

  return NextResponse.redirect(target, getRedirectStatus());
}

export const config = {
  matcher: ['/movie/:path*'],
};
