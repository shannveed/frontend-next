// frontend-next/src/app/sitemap-videos.xml/route.js
export const runtime = 'edge';

export function GET() {
  return new Response('sitemap-videos.xml has been removed.', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
