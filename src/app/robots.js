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
          '/push-notification',
          '/categories',
          '/users',
          '/profile',
          '/password',
          '/favorites',
          '/api',
        ],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap-index.xml`,
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-videos.xml`,
    ],
  };
}
