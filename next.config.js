/** @type {import('next').NextConfig} */
const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend-six.vercel.app';

// normalize: remove trailing slashes + accidental "/api"
const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api$/i, '');

const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com';
const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 'www.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost.com', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'moviefrost-backend-six.vercel.app',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    optimizePackageImports: ['react-icons', 'swiper'],
  },

  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },

        // sitemaps are served by backend
        { source: '/sitemap.xml', destination: `${API_BASE}/sitemap.xml` },
        {
          source: '/sitemap-index.xml',
          destination: `${API_BASE}/sitemap-index.xml`,
        },

        // Do NOT rewrite /sitemap-actors.xml
        // It is served by frontend route and returns 410
      ],
    };
  },

  async redirects() {
    const redirects = [
      {
        source: '/favicon.ico',
        destination: '/images/favicon1.png',
        permanent: true,
      },
      {
        source: '/favicon1.png',
        destination: '/images/favicon1.png',
        permanent: true,
      },
    ];

    if (new URL(SITE_URL).hostname === 'www.moviefrost.com') {
      redirects.push({
        source: '/:path*',
        has: [{ type: 'host', value: 'moviefrost.com' }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      });
    }

    return redirects;
  },

  async headers() {
    const faviconCache =
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

    return [
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: faviconCache }],
      },

      // /watch pages should not be indexed
      {
        source: '/watch/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },

      // actor pages now return 410; keep robots header strict too
      {
        source: '/actor/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },

      {
        source: '/service-worker.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
