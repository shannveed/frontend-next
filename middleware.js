import { NextResponse } from 'next/server';

/**
 * Geo allowlist (Vercel Edge Middleware)
 *
 * - Blocks ALL pages + /api/* unless request country is allowed.
 * - Uses request.geo.country when available (Vercel).
 * - Falls back to Cloudflare header (CF-IPCountry) and Vercel header.
 *
 * ENV (Vercel -> frontend-next project):
 * - GEO_BLOCK_ENABLED=true   (default: true in production if missing)
 * - GEO_BLOCK_DEFAULT_ALLOW=true  (default: true; missing geo => allow)
 */

const IS_PROD = process.env.NODE_ENV === 'production';

const GEO_BLOCK_ENABLED =
  String(process.env.GEO_BLOCK_ENABLED ?? 'true').toLowerCase() === 'true';

const GEO_BLOCK_DEFAULT_ALLOW =
  String(process.env.GEO_BLOCK_DEFAULT_ALLOW ?? 'true').toLowerCase() === 'true';

/**
 * EUROPE (broad list). If you want "ONLY some European countries",
 * remove the ones you don't want.
 */
const EUROPE_COUNTRY_CODES = [
  'AL','AD','AM','AT','AZ','AX','BA','BE','BG','BY','CH','CY','CZ','DE','DK','EE','ES','FI','FO','FR','GB','GE','GG','GI','GR',
  'HR','HU','IE','IM','IS','IT','JE','KZ','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','RU','SE',
  'SI','SJ','SK','SM','TR','UA','VA','XK',

  // some systems may send "UK"
  'UK',
];

/**
 * Extra allowed countries from your list (outside Europe)
 */
const EXTRA_ALLOWED = [
  'US', // United States
  'CA', // Canada
  'PK', // Pakistan
  'IN', // India
  'MX', // Mexico
  'BR', // Brazil
  'JP', // Japan
  'KR', // South Korea
  'AU', // Australia
  'NZ', // New Zealand

  // South America
  'VE', // Venezuela
  'EC', // Ecuador
  'CO', // Colombia
  'AR', // Argentina
  'PY', // Paraguay
  'UY', // Uruguay

  // Greenland (requested)
  'GL',

  // Africa
  'MA', // Morocco
  'KE', // Kenya
  'ZA', // South Africa
  'NA', // Namibia
  'EG', // Egypt
  'NG', // Nigeria

  // Middle East
  'SA', // Saudi Arabia
  'OM', // Oman
  'AE', // United Arab Emirates
  'QA', // Qatar
  'BH', // Bahrain
  'KW', // Kuwait

  // Asia
  'MY', // Malaysia
  'SG', // Singapore
  'ID', // Indonesia
  'TH', // Thailand
  'VN', // Vietnam
  'PH', // Philippines
  'NP', // Nepal
];

const ALLOWED = new Set(
  [...EUROPE_COUNTRY_CODES, ...EXTRA_ALLOWED].map((c) => String(c).toUpperCase())
);

// Always allow these internal/system routes (important)
const isBypassPath = (pathname = '') => {
  const p = String(pathname || '');

  // Allow revalidate endpoint (backend calls it server-to-server)
  if (p === '/revalidate') return true;

  // You can allow health/debug paths if you create any
  // if (p === '/health') return true;

  return false;
};

const getCountryCode = (request) => {
  // 1) Vercel Edge geo
  const geo = request.geo?.country;
  if (geo) return String(geo).trim().toUpperCase();

  // 2) If you proxy through Cloudflare, it sends CF-IPCountry to origin
  const cf = request.headers.get('cf-ipcountry');
  if (cf) return String(cf).trim().toUpperCase();

  // 3) Vercel header fallback
  const vx = request.headers.get('x-vercel-ip-country');
  if (vx) return String(vx).trim().toUpperCase();

  return '';
};

const blockedHtml = (country) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Not available in your region</title>
    <meta name="robots" content="noindex,nofollow"/>
    <style>
      body { margin:0; font-family: Arial, sans-serif; background:#080A1A; color:#fff; }
      .box { max-width:720px; margin:40px auto; padding:18px; border:1px solid #4b5563; border-radius:12px; background:#0B0F29; }
      h1 { font-size:18px; margin:0 0 10px; }
      p { color:#c0c0c0; margin:6px 0; line-height:1.6; }
      code { color:#fff; }
      a { color:#1B82FF; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>MovieFrost is not available in your region</h1>
      <p>Detected country: <code>${country || 'Unknown'}</code></p>
      <p>If you think this is a mistake, contact: <a href="mailto:support@moviefrost.com">support@moviefrost.com</a></p>
    </div>
  </body>
</html>`;

export function middleware(request) {
  if (!IS_PROD || !GEO_BLOCK_ENABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const country = getCountryCode(request);

  // If geo is missing: allow by default (prevents breaking internal server-to-server calls)
  if (!country) {
    if (GEO_BLOCK_DEFAULT_ALLOW) return NextResponse.next();

    return NextResponse.json(
      { ok: false, message: 'Geo not available. Access denied.' },
      { status: 451, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (ALLOWED.has(country)) {
    return NextResponse.next();
  }

  // Block API requests with JSON, pages with HTML
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, message: 'This service is not available in your region.', country },
      {
        status: 451,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  return new NextResponse(blockedHtml(country), {
    status: 451,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * Run middleware on everything EXCEPT:
 * - Next internals
 * - common static files by extension (robots/sitemaps/favicon/images/etc)
 *
 * (We still block /api/* because /api/* doesn’t end with .json.)
 */
export const config = {
  matcher: [
    '/((?!_next/|.*\\.(?:css|js|map|png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|json|woff|woff2|ttf|eot)$).*)',
  ],
};
