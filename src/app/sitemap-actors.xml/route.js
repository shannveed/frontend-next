// frontend-next/src/app/sitemap-actors.xml/route.js
export const runtime = 'edge';

/**
 * Actor sitemap temporarily removed.
 *
 * Actor pages are currently unavailable/noindex, so they should not be
 * submitted in XML sitemaps.
 */
export function GET() {
  return new Response('sitemap-actors.xml has been removed.', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
