// frontend-next/src/app/robots.js
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
        crawlDelay: 1, // Google ignores; Bing/Yandex may respect it
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap-index.xml`,
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-videos.xml`,
      `${SITE_URL}/sitemap-actors.xml`,
    ],
  };
}
