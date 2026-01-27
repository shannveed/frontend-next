/** @type {import('next').NextConfig} */

const normalizeUrl = (raw, fallback) => {
  const v = String(raw || '').trim().replace(/\/+$/, '');
  if (!v) return fallback;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
};

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend.vercel.app';

// normalize: remove trailing slashes + accidental "/api"
const API_BASE = normalizeUrl(RAW_API_BASE, 'https://moviefrost-backend.vercel.app').replace(
  /\/api$/i,
  ''
);

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.moviefrost.com';
const SITE_URL = normalizeUrl(RAW_SITE_URL, 'https://www.moviefrost.com');

const nextConfig = {
  reactStrictMode: true,

  // Optional (helps in some Vercel caching cases)
  // output: 'standalone',

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost.com', pathname: '/**' },
      { protocol: 'https', hostname: 'moviefrost-backend.vercel.app', pathname: '/**' }
    ]
  },

  experimental: {
    optimizePackageImports: ['react-icons', 'swiper']
  },

  async rewrites() {
    return {
      beforeFiles: [
        // proxy API to backend
        { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },

        // sitemaps served by backend
        { source: '/sitemap.xml', destination: `${API_BASE}/sitemap.xml` },
        { source: '/sitemap-videos.xml', destination: `${API_BASE}/sitemap-videos.xml` }
      ]
    };
  },

  async redirects() {
    // Redirect moviefrost.com -> www.moviefrost.com when canonical is www
    try {
      const host = new URL(SITE_URL).hostname;
      if (host === 'www.moviefrost.com') {
        return [
          {
            source: '/:path*',
            has: [{ type: 'host', value: 'moviefrost.com' }],
            destination: `${SITE_URL}/:path*`,
            permanent: true
          }
        ];
      }
    } catch {
      // ignore
    }
    return [];
  },

  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
        ]
      }
    ];
  }

  // If your build is failing ONLY due to lint while migrating, uncomment:
  // eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
