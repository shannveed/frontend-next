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
          '/viewer-feedback',
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

          // Public form / private utility pages
          '/feedback',

          // Crawl-budget cleanup
          '/watch',
          '/search',
          '/login',
          '/signup',
          '/register',
        ],
      },
    ],

    sitemap: [`${SITE_URL}/sitemap-index.xml`, `${SITE_URL}/sitemap.xml`],
  };
}
