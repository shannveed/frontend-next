// src/app/robots.js
import { SITE_URL } from '../lib/seo';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/movieslist',
          '/addmovie',
          '/edit',
          '/bulk-create',
          '/get-movies',
          '/update-movies',
          '/preview',
          '/push-notification',
          '/categories',
          '/users',
          '/profile',
          '/password',
          '/favorites',
          '/api',
        ],
      },
      // ✅ Explicitly allow Bing/Yandex bots to ensure no accidental blocking
      {
        userAgent: ['Bingbot', 'Yandex'], 
        allow: '/',
      }
    ],
    sitemap: [
      `${SITE_URL}/sitemap-index.xml`,
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-videos.xml`,
      `${SITE_URL}/sitemap-actors.xml`,
    ],
  };
}
