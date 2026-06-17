// frontend-next/middleware.js
import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'https://moviefrost-backend-xi.vercel.app';
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

/**
 * Actor page temporary switch.
 *
 * Default: disabled.
 *
 * Later, when you want actor pages visible again:
 * Vercel frontend env:
 * NEXT_PUBLIC_ACTOR_PAGES_ENABLED=true
 *
 * They will still remain noindex because next.config.js + actor page metadata
 * default to noindex unless you explicitly set:
 * NEXT_PUBLIC_ACTOR_PAGES_NOINDEX=false
 */
const ACTOR_PAGES_ENABLED =
  String(process.env.NEXT_PUBLIC_ACTOR_PAGES_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';

const ACTOR_PAGES_DISABLED_STATUS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_ACTOR_PAGES_DISABLED_STATUS || 410);
  return [404, 410, 451, 503].includes(n) ? n : 410;
})();

const FETCH_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.HINDI_REDIRECT_FETCH_TIMEOUT_MS || 4500), 700),
  9000
);

// --- QUERY CLEANUP CONSTANTS & HELPERS ---

const CAMPAIGN_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
]);

const MOVIES_ALLOWED_QUERY_KEYS = new Set([
  'type',
  'category',
  'browseBy',
  'language',
  'year',
  'time',
  'rate',
  'search',
  'query',
  'q',
  'pageNumber',
  'page',
]);

function isCampaignParam(key = '') {
  const k = String(key || '').trim();
  return CAMPAIGN_QUERY_KEYS.has(k) || k.toLowerCase().startsWith('utm_');
}

function shouldKeepQueryParamForPath(pathname = '', key = '') {
  const path = String(pathname || '');

  if (isCampaignParam(key)) return true;

  if (path === '/movies' || path.startsWith('/movies/')) {
    return MOVIES_ALLOWED_QUERY_KEYS.has(key);
  }

  // Movie/watch detail pages should not keep random cache-busting query params.
  if (path.startsWith('/movie/') || path.startsWith('/watch/')) {
    return false;
  }

  return true;
}

function stripUnknownQueryParams(req) {
  const { nextUrl } = req;

  if (!nextUrl.search) return null;

  const before = nextUrl.searchParams.toString();
  const cleaned = new URLSearchParams();

  for (const [key, value] of nextUrl.searchParams.entries()) {
    if (shouldKeepQueryParamForPath(nextUrl.pathname, key)) {
      cleaned.append(key, value);
    }
  }

  const after = cleaned.toString();

  if (before === after) return null;

  const target = nextUrl.clone();
  target.search = after ? `?${after}` : '';

  return NextResponse.redirect(target, { status: 307 });
}

// -----------------------------------------

const API_BASE_CANDIDATES = (() => {
  const rawList = [
    RAW_API_BASE,
    process.env.BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_API_BASE,
    'https://moviefrost-backend-xi.vercel.app',
    'https://moviefrost-backend-peach.vercel.app',
  ];

  const out = [];
  const seen = new Set();

  for (const raw of rawList) {
    const origin = normalizeOrigin(raw, '');
    if (!origin) continue;
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

const INDIAN_LANGUAGE_KEYS = INDIAN_LANGUAGE_WORDS.map(normalizeLanguageKey).filter(Boolean);
const INDIAN_CONTENT_KEYS = INDIAN_CONTENT_MARKERS.map(normalizeLanguageKey).filter(Boolean);

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

  if (
    current === hindiHost ||
    current === 'hi.moviefrost.com' ||
    current === 'www.hi.moviefrost.com' ||
    current === 'wwwhi.moviefrost.com'
  ) {
    return false;
  }

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

  // ✅ PRIORITY 1: Same-domain via Next.js rewrite (most reliable in Edge runtime)
  try {
    urls.push(new URL(`/api/movies/redirect-info/${safe}`, req.url).toString());
  } catch {
    // ignore
  }

  // ✅ PRIORITY 2: Absolute backend URLs as fallback
  for (const base of API_BASE_CANDIDATES) {
    urls.push(`${base}/api/movies/redirect-info/${safe}`);
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
      return { ok: false, status: res.status, data: null };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, status: res.status, data };
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
  const attempts = [];

  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchJsonWithTimeout(url);

    attempts.push({
      url,
      status: result.status,
      ok: result.ok,
      error: result.error || '',
    });

    if (result.ok && result.data) {
      return { movie: result.data, attempts };
    }
  }

  return { movie: null, attempts };
}

function nextWithDebug(reason = '', extra = {}) {
  const res = NextResponse.next();

  if (DEBUG_REDIRECT && reason) {
    res.headers.set('X-MF-Hindi-Redirect', reason);

    if (extra && typeof extra === 'object') {
      Object.entries(extra).forEach(([k, v]) => {
        try {
          res.headers.set(`X-MF-Hindi-${k}`, String(v).slice(0, 200));
        } catch {
          // ignore
        }
      });
    }
  }

  return res;
}

/* ============================================================
   Actor pages disabled response
   ============================================================ */

const escapeHtml = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function isActorPagePath(pathname = '') {
  const path = String(pathname || '').trim();
  return path === '/actor' || path === '/actor/' || path.startsWith('/actor/');
}

function actorPagesDisabledResponse(req) {
  const homeUrl = new URL('/', req.url).toString();
  const moviesUrl = new URL('/movies', req.url).toString();

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="googlebot" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Actor pages temporarily unavailable | MovieFrost</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #080A1A;
        color: #fff;
        font-family: Arial, sans-serif;
      }
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        width: 100%;
        max-width: 620px;
        background: #0B0F29;
        border: 1px solid #4b5563;
        border-radius: 16px;
        padding: 28px;
        box-sizing: border-box;
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.3;
      }
      p {
        color: #C0C0C0;
        line-height: 1.7;
        margin: 14px 0 0;
      }
      .actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 24px;
      }
      a {
        color: #fff;
        background: #1B82FF;
        text-decoration: none;
        padding: 12px 18px;
        border-radius: 10px;
        font-weight: 700;
      }
      a.secondary {
        background: transparent;
        border: 1px solid #4b5563;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>Actor pages are temporarily unavailable</h1>
        <p>
          MovieFrost actor profile pages are currently disabled while we improve this feature.
          You can continue browsing movies and web series.
        </p>
        <div class="actions">
          <a href="${escapeHtml(moviesUrl)}">Browse Movies</a>
          <a class="secondary" href="${escapeHtml(homeUrl)}">Go Home</a>
        </div>
      </section>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: ACTOR_PAGES_DISABLED_STATUS,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function middleware(req) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname || '';

  // ✅ Temporarily disable public actor pages with 410 + noindex.
  // This runs before any API calls or page rendering.
  if (isActorPagePath(pathname) && !ACTOR_PAGES_ENABLED) {
    return actorPagesDisabledResponse(req);
  }

  // Execute query cleanup
  const queryCleanup = stripUnknownQueryParams(req);
  if (queryCleanup) return queryCleanup;

  if (!ENABLE_REDIRECT) {
    return nextWithDebug('disabled');
  }

  if (!pathname.startsWith('/movie/')) {
    return nextWithDebug('not-movie-path');
  }

  if (!shouldRedirectFromHost(nextUrl.hostname)) {
    return nextWithDebug('host-not-eligible', { Host: nextUrl.hostname });
  }

  const slug = getMovieSlugFromPathname(pathname);
  if (!slug) {
    return nextWithDebug('missing-slug');
  }

  const { movie, attempts } = await fetchMovieRedirectInfo(slug, req);

  if (!movie) {
    if (DEBUG_REDIRECT) {
      console.warn('[hindi-redirect] all lookup attempts failed:', attempts);
    }

    const lastAttempt = attempts[attempts.length - 1];

    return nextWithDebug('movie-lookup-failed', {
      Attempts: attempts.length,
      LastUrl: lastAttempt?.url || '',
      LastStatus: lastAttempt?.status || 0,
      LastError: lastAttempt?.error || '',
    });
  }

  if (!movieHasIndianLanguage(movie)) {
    return nextWithDebug('non-indian-content', {
      Lang: clean(movie?.language),
      BrowseBy: clean(movie?.browseBy),
      Name: clean(movie?.name),
      Slug: clean(movie?.slug),
    });
  }

  const canonicalSeg = clean(movie.slug) || slug;
  if (!canonicalSeg) {
    return nextWithDebug('missing-canonical-segment');
  }

  const target = new URL(HINDI_ORIGIN);
  target.pathname = `/movie/${encodeURIComponent(canonicalSeg)}`;
  target.search = nextUrl.search;

  const res = NextResponse.redirect(target, { status: getRedirectStatus() });

  if (DEBUG_REDIRECT) {
    res.headers.set('X-MF-Hindi-Redirect', 'redirected');
    res.headers.set('X-MF-Hindi-Language', clean(movie?.language));
    res.headers.set('X-MF-Hindi-BrowseBy', clean(movie?.browseBy));
    res.headers.set('X-MF-Hindi-Target', target.toString());
  }

  return res;
}

export const config = {
  matcher: [
    '/actor/:path*',
    '/movie/:path*',
    '/watch/:path*',
    '/movies',
    '/movies/:path*',
  ],
};
