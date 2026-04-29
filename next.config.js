/** @type {import('next').NextConfig} */

const ensureUrl = (value, fallback) => {
  let v = String(value || fallback || '').trim();

  if (!v) return fallback;

  if (!/^https?:\/\//i.test(v)) {
    const isLocal =
      v.startsWith('localhost') ||
      v.startsWith('127.0.0.1') ||
      v.startsWith('0.0.0.0');

    v = `${isLocal ? 'http' : 'https'}://${v.replace(/^\/+/, '')}`;
  }

  return v.replace(/\/+$/, '');
};

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://moviefrost-backend-peach.vercel.app';

const API_BASE = ensureUrl(RAW_API_BASE, 'https://moviefrost-backend-peach.vercel.app')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com';

const SITE_URL = ensureUrl(RAW_SITE_URL, 'https://www.moviefrost.com').replace(
  /\/+$/,
  ''
);

const IMAGE_CACHE =
  'public, max-age=31536000, s-maxage=31536000, immutable';

const FAVICON_CACHE =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

const remotePatternFromUrl = (url) => {
  try {
    const u = new URL(url);

    if (!['http:', 'https:'].includes(u.protocol)) return null;

    return {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: '/**',
    };
  } catch {
    return null;
  }
};

const uniqueRemotePatterns = (patterns = []) => {
  const seen = new Set();

  return patterns.filter((pattern) => {
    if (!pattern?.hostname) return false;

    const key = `${pattern.protocol || ''}:${pattern.hostname}:${pattern.port || ''}:${pattern.pathname || ''}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const buildCanonicalHostRedirects = () => {
  const redirects = [];

  try {
    const u = new URL(SITE_URL);
    const host = u.hostname;

    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.localhost');

    if (isLocal) return redirects;

    /**
     * English:
     * NEXT_PUBLIC_SITE_URL=https://www.moviefrost.com
     * moviefrost.com -> www.moviefrost.com
     *
     * Hindi:
     * NEXT_PUBLIC_SITE_URL=https://hi.moviefrost.com
     * www.hi.moviefrost.com -> hi.moviefrost.com
     */
    if (host.startsWith('www.')) {
      redirects.push({
        source: '/:path*',
        has: [{ type: 'host', value: host.slice(4) }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      });
    } else {
      redirects.push({
        source: '/:path*',
        has: [{ type: 'host', value: `www.${host}` }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      });
    }
  } catch {
    // ignore bad SITE_URL
  }

  return redirects;
};

const dynamicApiRemotePattern = remotePatternFromUrl(API_BASE);

const nextConfig = {
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,

    remotePatterns: uniqueRemotePatterns([
      { protocol: 'https', hostname: 'cdn.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 'www.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'hi.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.hi.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api-hi.moviefrost.com', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'moviefrost-backend-peach.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'moviefrost-backend-six.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'moviefrost-backend.vercel.app',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'fra.cloud.appwrite.io', pathname: '/**' },
      { protocol: 'https', hostname: 'cloud.appwrite.io', pathname: '/**' },
      dynamicApiRemotePattern,
    ]),
  },

  experimental: {
    optimizePackageImports: ['react-icons', 'swiper'],
  },

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${API_BASE}/api/:path*`,
        },

        {
          source: '/sitemap.xml',
          destination: `${API_BASE}/sitemap.xml`,
        },
        {
          source: '/sitemap-index.xml',
          destination: `${API_BASE}/sitemap-index.xml`,
        },

        // Do NOT rewrite /sitemap-actors.xml.
        // It is served by frontend route and returns 410.
      ],
    };
  },

  async redirects() {
    return [
      {
        source: '/favicon1.png',
        destination: '/images/favicon1.png',
        permanent: true,
      },
      ...buildCanonicalHostRedirects(),
    ];
  },

  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: FAVICON_CACHE }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: IMAGE_CACHE }],
      },
      {
        source: '/watch/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
      {
        source: '/actor/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
