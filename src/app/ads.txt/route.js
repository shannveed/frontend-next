// frontend-next/src/app/ads.txt/route.js
export const runtime = 'edge';

/**
 * Serves https://www.moviefrost.com/ads.txt
 * by proxying Ezoic's AdstxtManager file.
 *
 * Benefits:
 * - 200 OK on your domain (best compatibility)
 * - Auto-updated by Ezoic (no manual updates / cron)
 */

const getHostFromRequest = (req) => {
  const xfHost = req.headers.get('x-forwarded-host');
  const host = xfHost || req.headers.get('host') || '';
  return host.split(',')[0].trim().split(':')[0].trim();
};

const getDomainForEzoic = (req) => {
  // 1) Explicit env always wins
  const envDomain = String(process.env.EZOIC_ADSTXT_DOMAIN || '').trim();
  if (envDomain) return envDomain.replace(/^https?:\/\//i, '').split('/')[0];

  // 2) Use request host if it looks like a real domain
  const reqHost = getHostFromRequest(req);
  const isPreview =
    !reqHost ||
    reqHost === 'localhost' ||
    reqHost.endsWith('.vercel.app') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(reqHost);

  if (!isPreview) return reqHost;

  // 3) Fallback to NEXT_PUBLIC_SITE_URL
  const site = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  try {
    return site ? new URL(site).hostname : 'www.moviefrost.com';
  } catch {
    return 'www.moviefrost.com';
  }
};

const buildManagerUrl = (req) => {
  const full = String(process.env.EZOIC_ADSTXT_URL || '').trim();
  if (full) return full;

  const id = String(process.env.EZOIC_ADSTXT_ID || '').trim();
  if (!id) return '';

  const domain = getDomainForEzoic(req);
  return `https://srv.adstxtmanager.com/${id}/${domain}`;
};

export async function GET(req) {
  const managerUrl = buildManagerUrl(req);

  if (!managerUrl) {
    // Safe fallback (won't break deploy)
    return new Response('# ads.txt not configured (missing EZOIC_ADSTXT_URL or EZOIC_ADSTXT_ID)\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  }

  try {
    const res = await fetch(managerUrl, { cache: 'no-store' });
    const text = await res.text();

    if (!res.ok || !text || !text.trim()) {
      throw new Error(`AdstxtManager returned HTTP ${res.status}`);
    }

    return new Response(text.trim() + '\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // cache at CDN to reduce hits
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // As a last resort, follow Ezoic's redirect method
    return Response.redirect(managerUrl, 301);
  }
}
