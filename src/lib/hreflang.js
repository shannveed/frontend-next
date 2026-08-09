// frontend-next/src/lib/hreflang.js
import { SITE_URL, clean } from './seo';

const IS_PROD_RUNTIME =
  process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const normalizeOrigin = (value = '', fallback = '') => {
  let v = String(value || fallback || '').trim();

  if (!v) return '';

  if (!/^https?:\/\//i.test(v)) {
    v = `https://${v.replace(/^\/+/, '')}`;
  }

  return v.replace(/\/+$/, '');
};

const isLoopbackOrigin = (value = '') => {
  try {
    const host = new URL(value).hostname.toLowerCase();

    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost')
    );
  } catch {
    return true;
  }
};

/**
 * Production hreflang URLs must never point at localhost.
 * Rejects loopback/unparsable env values in production builds.
 */
const resolveSeoOrigin = (value = '', fallback = '') => {
  const normalized = normalizeOrigin(value, '');

  if (!normalized) return normalizeOrigin(fallback, fallback);

  if (IS_PROD_RUNTIME && isLoopbackOrigin(normalized)) {
    return normalizeOrigin(fallback, fallback);
  }

  return normalized;
};

const normalizePath = (path = '/') => {
  const p = clean(path);
  if (!p) return '/';

  // Never allow absolute URL here.
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      return u.pathname || '/';
    } catch {
      return '/';
    }
  }

  return p.startsWith('/') ? p : `/${p}`;
};

export const ENGLISH_SITE_URL = resolveSeoOrigin(
  process.env.NEXT_PUBLIC_ENGLISH_SITE_URL,
  'https://www.flixmovo.online'
);

export const HINDI_SITE_URL = resolveSeoOrigin(
  process.env.NEXT_PUBLIC_HINDI_SITE_URL,
  'https://hi.flixmovo.online'
);

/**
 * ✅ Q2 FIX: hreflang mismatch
 *
 * hi.flixmovo.online is the Hindi edition, so its hreflang must be a
 * Hindi language code ("hi" or "hi-IN"), NOT "en-IN".
 *
 * Google ignores mismatched hreflang pairs entirely, which removed the
 * targeting benefit for both domains.
 *
 * The env value is validated against BCP-47-like syntax. Invalid or
 * missing values fall back to "hi-IN".
 *
 * IMPORTANT: set NEXT_PUBLIC_HINDI_HREFLANG=hi-IN on BOTH deployments
 * (www + hi) so the return/reciprocal tags match.
 */
const normalizeHreflangCode = (value = '') => {
  const raw = clean(value);

  if (!/^[a-z]{2,3}(-[a-z]{2})?$/i.test(raw)) return '';

  const [lang, region] = raw.split('-');

  return region
    ? `${lang.toLowerCase()}-${region.toUpperCase()}`
    : lang.toLowerCase();
};

export const INDIA_HREFLANG =
  normalizeHreflangCode(process.env.NEXT_PUBLIC_HINDI_HREFLANG) || 'hi-IN';

/**
 * Returns Next.js metadata alternates:
 *
 * <link rel="canonical" href="current-site-url/path" />
 * <link rel="alternate" hreflang="en" href="https://www.flixmovo.online/path" />
 * <link rel="alternate" hreflang="hi-IN" href="https://hi.flixmovo.online/path" />
 * <link rel="alternate" hreflang="x-default" href="https://www.flixmovo.online/path" />
 */
export const buildHreflangAlternatesForPath = (
  path = '/',
  { canonical = '' } = {}
) => {
  const p = normalizePath(path);

  return {
    canonical: clean(canonical) || `${SITE_URL}${p}`,
    languages: {
      en: `${ENGLISH_SITE_URL}${p}`,
      [INDIA_HREFLANG]: `${HINDI_SITE_URL}${p}`,
      'x-default': `${ENGLISH_SITE_URL}${p}`,
    },
  };
};