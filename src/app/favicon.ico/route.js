// frontend-next/src/app/favicon.ico/route.js
export const runtime = 'edge';

const ICON_PATH = '/images/desktop-icon-192.png';

export async function GET(request) {
  try {
    const iconUrl = new URL(ICON_PATH, request.url);

    const iconResponse = await fetch(iconUrl, {
      cache: 'force-cache',
      redirect: 'follow',
    });

    if (!iconResponse.ok || !iconResponse.body) {
      return new Response('Favicon not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response(iconResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="favicon.png"',
        'Cache-Control':
          'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Favicon unavailable', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
}
