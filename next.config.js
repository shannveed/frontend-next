/** @type {import('next').NextConfig} */
const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend.vercel.app';

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
      { protocol: 'https', hostname: 'www.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost-backend.vercel.app', pathname: '/**' },
    ],
  },

  experimental: {
    optimizePackageImports: ['react-icons', 'swiper'],
  },

  async rewrites() {
    return {
      beforeFiles: [
        // ✅ all frontend /api calls go to backend (no CORS, fast edge rewrite)
        { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },

        // ✅ keep sitemaps served by backend controllers
        { source: '/sitemap.xml', destination: `${API_BASE}/sitemap.xml` },
        { source: '/sitemap-videos.xml', destination: `${API_BASE}/sitemap-videos.xml` },
      ],
    };
  },

  // Optional: force canonical domain (or do this in Vercel domains UI)
  async redirects() {
    // If your canonical is www.moviefrost.com
    if (new URL(SITE_URL).hostname === 'www.moviefrost.com') {
      return [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'moviefrost.com' }],
          destination: `${SITE_URL}/:path*`,
          permanent: true,
        },
      ];
    }
    return [];
  },

  async headers() {
    return [
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
