// frontend-next/src/lib/image.js

const DEFAULT_SITE_ORIGIN = 'https://www.moviefrost.com';
const DEFAULT_API_ORIGIN = 'https://moviefrost-backend-six.vercel.app';
const DEFAULT_CDN_ORIGIN = 'https://cdn.moviefrost.com';

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN;
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_ORIGIN;
const RAW_CDN_BASE = process.env.NEXT_PUBLIC_CDN_BASE_URL || DEFAULT_CDN_ORIGIN;

const normalizeOrigin = (value, fallback, { stripApi = false } = {}) => {
  let v = String(value || fallback || '').trim();
  if (!v) return '';

  if (!/^https?:\/\//i.test(v)) {
    v = `https://${v.replace(/^\/+/, '')}`;
  }

  v = v.replace(/\/+$/, '');

  if (stripApi) v = v.replace(/\/api$/i, '');

  return v;
};

export const SITE_ORIGIN = normalizeOrigin(RAW_SITE_URL, DEFAULT_SITE_ORIGIN);
export const API_ORIGIN = normalizeOrigin(RAW_API_BASE, DEFAULT_API_ORIGIN, {
  stripApi: true,
});
export const CDN_ORIGIN = normalizeOrigin(RAW_CDN_BASE, DEFAULT_CDN_ORIGIN);

export const DEFAULT_PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

const NEXT_IMAGE_SAFE_HOSTS = new Set([
  'cdn.moviefrost.com',
  'image.tmdb.org',
  'www.moviefrost.com',
  'moviefrost.com',
  'moviefrost-backend-six.vercel.app',
  'moviefrost-backend.vercel.app',
  'fra.cloud.appwrite.io',
  'cloud.appwrite.io',
]);

const BARE_IMAGE_FILE_RE = /^[^/\\]+\.(avif|gif|jpe?g|png|svg|webp)$/i;

const clean = (value = '') => String(value ?? '').trim().replace(/\\/g, '/');

const isEmptyLike = (value = '') => {
  const v = clean(value);
  return !v || /^(null|undefined|nan)$/i.test(v);
};

const isDomainOnly = (value = '') =>
  /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(clean(value));

const toHttpsUrl = (raw = '') => {
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return String(raw || '').replace(/^http:\/\//i, 'https://');
  }
};

export const canUseNextImage = (value = '') => {
  const src = clean(value);
  if (!src) return false;

  if (src.startsWith('/')) return true;
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;

  try {
    const u = new URL(src);
    return (
      u.protocol === 'https:' &&
      NEXT_IMAGE_SAFE_HOSTS.has(String(u.hostname || '').toLowerCase())
    );
  } catch {
    return false;
  }
};

export const normalizeImageUrl = (
  value,
  fallback = DEFAULT_PLACEHOLDER_IMAGE
) => {
  const raw = clean(value);

  if (isEmptyLike(raw)) return fallback;

  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  // Full URL
  if (/^https?:\/\//i.test(raw)) {
    return toHttpsUrl(raw);
  }

  // Protocol-relative URL
  if (raw.startsWith('//')) {
    return toHttpsUrl(`https:${raw}`);
  }

  // Old relative upload key/path -> R2 CDN
  if (raw.startsWith('/uploads/')) {
    return `${CDN_ORIGIN}${raw}`;
  }

  if (raw.startsWith('uploads/')) {
    return `${CDN_ORIGIN}/${raw}`;
  }

  // Local public images
  if (/^images\//i.test(raw)) {
    return `/${raw.replace(/^\/+/, '')}`;
  }

  if (/^placeholder\.(avif|gif|jpe?g|png|svg|webp)$/i.test(raw)) {
    return DEFAULT_PLACEHOLDER_IMAGE;
  }

  if (/^moviefrost\.png$/i.test(raw)) {
    return '/images/MOVIEFROST.png';
  }

  // Bare filename from old seed/local records -> /public/images/movies/<file>
  if (BARE_IMAGE_FILE_RE.test(raw)) {
    return `/images/movies/${raw}`;
  }

  // Domain without protocol
  if (isDomainOnly(raw)) {
    return toHttpsUrl(`https://${raw.replace(/^\/+/, '')}`);
  }

  // Any other local absolute path
  if (raw.startsWith('/')) {
    return raw;
  }

  return fallback;
};

export const normalizeImageCandidates = (values = []) => {
  const list = Array.isArray(values) ? values : [values];
  const out = [];
  const seen = new Set();

  for (const value of list) {
    const src = normalizeImageUrl(value, '');
    if (!src) continue;

    const key = src.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(src);
  }

  return out;
};

export const pickBestImage = (
  values = [],
  fallback = DEFAULT_PLACEHOLDER_IMAGE
) => {
  const list = normalizeImageCandidates(values);
  return list[0] || fallback;
};
