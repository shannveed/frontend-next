/** @type {import('next').NextConfig} */

const ensureUrl = (value, fallback) => {
  let next = String(value || fallback || '').trim();

  if (!next) return fallback;

  if (!/^https?:\/\//i.test(next)) {
    const isLocal =
      next.startsWith('localhost') ||
      next.startsWith('127.0.0.1') ||
      next.startsWith('0.0.0.0') ||
      next.startsWith('hi.localhost');

    next = `${isLocal ? 'http' : 'https'}://${next.replace(/^\/+/, '')}`;
  }

  return next.replace(/\/+$/, '');
};

const parseCsv = (value = '') =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items = []) =>
  Array.from(
    new Set(
      (items || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.flixmovo.online';

const API_BASE = ensureUrl(
  RAW_API_BASE,
  'https://api.flixmovo.online'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://www.flixmovo.online';

const SITE_URL = ensureUrl(
  RAW_SITE_URL,
  'https://www.flixmovo.online'
).replace(/\/+$/, '');

const ENGLISH_SITE_URL = ensureUrl(
  process.env.NEXT_PUBLIC_ENGLISH_SITE_URL,
  'https://www.flixmovo.online'
);

const HINDI_SITE_URL = ensureUrl(
  process.env.NEXT_PUBLIC_HINDI_SITE_URL,
  'https://hi.flixmovo.online'
);

const CDN_BASE_URL = ensureUrl(
  process.env.NEXT_PUBLIC_CDN_BASE_URL,
  'https://cdn.flixmovo.online'
);

const IMAGE_CACHE =
  'public, max-age=31536000, s-maxage=31536000, immutable';

const FAVICON_CACHE =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

const ACTOR_PAGES_NOINDEX =
  String(process.env.NEXT_PUBLIC_ACTOR_PAGES_NOINDEX ?? 'true')
    .trim()
    .toLowerCase() !== 'false';

const remotePatternFromUrl = (url) => {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
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

    const key = [
      pattern.protocol || '',
      pattern.hostname || '',
      pattern.port || '',
      pattern.pathname || '',
    ].join(':');

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const hostFromValue = (value = '') => {
  let next = String(value || '').trim();
  if (!next) return '';

  if (!/^https?:\/\//i.test(next)) {
    next = `https://${next}`;
  }

  try {
    return new URL(next).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const currentSiteHost = hostFromValue(SITE_URL);

/**
 * Production frontend environment:
 *
 * English deployment:
 * LEGACY_SITE_HOSTS=moviefrost.com,www.moviefrost.com
 *
 * Hindi deployment:
 * LEGACY_SITE_HOSTS=hi.moviefrost.com,www.hi.moviefrost.com
 *
 * Keep the old domains attached to Vercel while these redirects are active.
 */
const LEGACY_SITE_HOSTS = unique(
  parseCsv(process.env.LEGACY_SITE_HOSTS)
    .map(hostFromValue)
    .filter((host) => host && host !== currentSiteHost)
);

const buildLegacyHostRedirects = () =>
  LEGACY_SITE_HOSTS.map((host) => ({
    source: '/:path*',
    has: [{ type: 'host', value: host }],
    destination: `${SITE_URL}/:path*`,
    permanent: true,
  }));

const buildCanonicalHostRedirects = () => {
  const redirects = [];

  try {
    const parsed = new URL(SITE_URL);
    const host = parsed.hostname.toLowerCase();

    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.localhost');

    if (isLocal) return redirects;

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
    // Ignore malformed SITE_URL.
  }

  return redirects;
};

const nextConfig = {
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,

    remotePatterns: uniqueRemotePatterns([
      {
        protocol: 'https',
        hostname: 'cdn.flixmovo.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'www.flixmovo.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flixmovo.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hi.flixmovo.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.flixmovo.online',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloud.appwrite.io',
        pathname: '/**',
      },

      remotePatternFromUrl(API_BASE),
      remotePatternFromUrl(SITE_URL),
      remotePatternFromUrl(ENGLISH_SITE_URL),
      remotePatternFromUrl(HINDI_SITE_URL),
      remotePatternFromUrl(CDN_BASE_URL),
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

        // sitemap-actors.xml remains a frontend 410 response because
        // actor pages are visible to users but intentionally noindex.
      ],
    };
  },

  async redirects() {
    return [
      ...buildLegacyHostRedirects(),
      ...buildCanonicalHostRedirects(),

      {
        source: '/favicon1.png',
        destination: '/images/favicon1.png',
        permanent: true,
      },
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

      ...(ACTOR_PAGES_NOINDEX
        ? [
          {
            source: '/actor/:path*',
            headers: [
              {
                key: 'X-Robots-Tag',
                value: 'noindex, follow',
              },
            ],
          },
          {
            source: '/sitemap-actors.xml',
            headers: [
              {
                key: 'X-Robots-Tag',
                value: 'noindex, follow',
              },
            ],
          },
        ]
        : []),

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
