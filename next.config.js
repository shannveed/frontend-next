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
        { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },

        // sitemaps are served by backend
        { source: '/sitemap.xml', destination: `${API_BASE}/sitemap.xml` },
        { source: '/sitemap-videos.xml', destination: `${API_BASE}/sitemap-videos.xml` },
        { source: '/sitemap-index.xml', destination: `${API_BASE}/sitemap-index.xml` },
        { source: '/sitemap-actors.xml', destination: `${API_BASE}/sitemap-actors.xml` },
      ],
    };
  },

  async redirects() {
    const redirects = [
      // ✅ Browsers often request /favicon.ico even if you set a PNG favicon.
      // This lets you remove favicon.ico safely.
      {
        source: '/favicon.ico',
        destination: '/images/favicon1.png',
        permanent: true,
      },

      // ✅ Optional: if anything still links to /favicon1.png
      {
        source: '/favicon1.png',
        destination: '/images/favicon1.png',
        permanent: true,
      },
    ];

    // Force moviefrost.com -> www.moviefrost.com if your canonical host is www
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
      // ✅ New favicon location
      {
        source: '/images/favicon1.png',
        headers: [{ key: 'Cache-Control', value: faviconCache }],
      },

      // keep your existing headers:
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
