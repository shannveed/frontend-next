// frontend-next/src/lib/hreflang.js
import { SITE_URL, clean } from './seo';

const normalizeOrigin = (value = '', fallback = '') => {
  let v = String(value || fallback || '').trim();

  if (!v) return '';

  if (!/^https?:\/\//i.test(v)) {
    v = `https://${v.replace(/^\/+/, '')}`;
  }

  return v.replace(/\/+$/, '');
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

export const ENGLISH_SITE_URL = normalizeOrigin(
  process.env.NEXT_PUBLIC_ENGLISH_SITE_URL,
  'https://www.moviefrost.com'
);

export const HINDI_SITE_URL = normalizeOrigin(
  process.env.NEXT_PUBLIC_HINDI_SITE_URL,
  'https://hi.moviefrost.com'
);

// You asked for en-IN.
// If the Hindi site later becomes fully Hindi-language content, change this to hi-IN.
export const INDIA_HREFLANG =
  clean(process.env.NEXT_PUBLIC_HINDI_HREFLANG) || 'en-IN';

/**
 * Returns Next.js metadata alternates:
 *
 * <link rel="canonical" href="current-site-url/path" />
 * <link rel="alternate" hreflang="en" href="https://www.moviefrost.com/path" />
 * <link rel="alternate" hreflang="en-IN" href="https://hi.moviefrost.com/path" />
 * <link rel="alternate" hreflang="x-default" href="https://www.moviefrost.com/path" />
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
