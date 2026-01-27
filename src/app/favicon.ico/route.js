// frontend-next/src/app/favicon.ico/route.js
/**
 * Google Search + many bots request /favicon.ico directly.
 * This route serves your existing /public/favicon1.png as /favicon.ico
 * so Google will use your real favicon in search results.
 */
export const runtime = 'edge';

export async function GET(request) {
  const iconUrl = new URL('/favicon1.png', request.url);

  const iconRes = await fetch(iconUrl, { cache: 'force-cache' });

  if (!iconRes.ok) {
    return new Response('favicon1.png not found', { status: 404 });
  }

  return new Response(iconRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      // Do NOT use "immutable" for favicon (Google/browsers should be able to refresh it)
      'Cache-Control':
        'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
