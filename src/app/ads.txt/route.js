// frontend-next/src/app/ads.txt/route.js
export const runtime = 'edge';

/**
 * MovieFrost /ads.txt
 * - Proxies Ezoic AdstxtManager so /ads.txt is 200 OK on your domain.
 * - Tries both www + non-www variants to avoid "wrong domain" 404s.
 * - On failure, returns 200 with helpful debug comments (not blank).
 *
 * ENV (Vercel -> frontend-next project):
 *  - EZOIC_ADSTXT_URL (optional, full URL)
 *  - OR EZOIC_ADSTXT_ID + EZOIC_ADSTXT_DOMAIN
 */
const EZOIC_MANAGER_BASE = 'https://srv.adstxtmanager.com';

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const normalizeHost = (value = '') => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  return v
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(',')[0]
    .trim()
    .split(':')[0]
    .trim();
};

const isPreviewHost = (host) => {
  const h = normalizeHost(host);
  if (!h) return true;
  if (h === 'localhost') return true;
  if (h.endsWith('.vercel.app')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  return false;
};

const getHostFromRequest = (req) => {
  const xfHost = req.headers.get('x-forwarded-host');
  const host = xfHost || req.headers.get('host') || '';
  return normalizeHost(host);
};

const domainVariants = (domain) => {
  const d = normalizeHost(domain);
  if (!d) return [];
  if (d.startsWith('www.')) return uniq([d, d.slice(4)]);
  return uniq([d, `www.${d}`]);
};

const normalizeUrl = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, '');
  return `https://${s.replace(/^\/+/, '')}`.replace(/\/+$/, '');
};

// If URL is an AdstxtManager style URL, swap www <-> apex inside the path
const swapWwwInManagerUrl = (rawUrl) => {
  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes('adstxtmanager.com')) return '';

    const parts = u.pathname.split('/').filter(Boolean);
    // expected: /<id>/<domain>/...
    if (parts.length < 2) return '';

    const domain = normalizeHost(parts[1]);
    const alt = domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`;
    if (!alt || alt === domain) return '';

    parts[1] = alt;
    u.pathname = '/' + parts.join('/');
    return u.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const buildCandidateUrls = (req) => {
  const fullEnvUrl = normalizeUrl(process.env.EZOIC_ADSTXT_URL);
  const id = String(process.env.EZOIC_ADSTXT_ID || '').trim();
  const envDomain = String(process.env.EZOIC_ADSTXT_DOMAIN || '').trim();

  let resolvedDomain = normalizeHost(envDomain);

  // If env domain not provided, try request host (production domains only)
  if (!resolvedDomain) {
    const reqHost = getHostFromRequest(req);
    if (!isPreviewHost(reqHost)) resolvedDomain = reqHost;
  }

  // Fallback to NEXT_PUBLIC_SITE_URL
  if (!resolvedDomain) {
    const site = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    try {
      resolvedDomain = site ? new URL(site).hostname : '';
    } catch {
      resolvedDomain = '';
    }
  }

  resolvedDomain = resolvedDomain || 'www.moviefrost.com';

  const domains = domainVariants(resolvedDomain);

  const bases = [];

  // 1) full URL (if provided)
  if (fullEnvUrl) bases.push(fullEnvUrl);

  // 2) ID+domain (if provided)
  if (id) {
    for (const d of domains) {
      bases.push(`${EZOIC_MANAGER_BASE}/${id}/${d}`);
    }
  }

  // Expand each base into likely variants (with/without /ads.txt + swapped www)
  const expanded = [];
  for (const b of uniq(bases)) {
    const base = String(b).replace(/\/+$/, '');
    expanded.push(base);

    // try /ads.txt variant
    if (!/\/ads\.txt$/i.test(base)) expanded.push(`${base}/ads.txt`);
    else expanded.push(base.replace(/\/ads\.txt$/i, ''));

    // try swapped www/apex inside path (if applicable)
    const swapped = swapWwwInManagerUrl(base);
    if (swapped) {
      expanded.push(swapped);
      if (!/\/ads\.txt$/i.test(swapped)) expanded.push(`${swapped}/ads.txt`);
    }
  }

  // Safety cap
  return uniq(expanded).slice(0, 12);
};

const responseHeaders = (extra = {}) => ({
  'Content-Type': 'text/plain; charset=utf-8',
  // Cache at CDN to reduce Ezoic hits
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  // ads.txt doesn’t need indexing
  'X-Robots-Tag': 'noindex, follow',
  ...extra,
});

export async function GET(req) {
  const candidates = buildCandidateUrls(req);

  if (!candidates.length) {
    return new Response(
      [
        '# MovieFrost ads.txt',
        '# ERROR: ads.txt proxy is not configured.',
        '# Set EZOIC_ADSTXT_URL OR (EZOIC_ADSTXT_ID + EZOIC_ADSTXT_DOMAIN) on Vercel.',
        '',
      ].join('\n'),
      { status: 200, headers: responseHeaders({ 'Cache-Control': 'public, max-age=60, s-maxage=60' }) }
    );
  }

  const attempts = [];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        redirect: 'follow',
        headers: {
          Accept: 'text/plain,text/*;q=0.9,*/*;q=0.8',
        },
      });

      const text = await res.text().catch(() => '');

      attempts.push({
        url,
        status: res.status,
        ok: res.ok,
        bytes: text ? text.length : 0,
      });

      // Success: non-empty body
      if (res.ok && text && text.trim()) {
        const body = text.replace(/\r\n/g, '\n').trimEnd() + '\n';
        return new Response(body, {
          status: 200,
          headers: responseHeaders({
            'X-AdsTxt-Source': url,
            'X-AdsTxt-Upstream-Status': String(res.status),
          }),
        });
      }
    } catch (e) {
      attempts.push({
        url,
        status: 0,
        ok: false,
        error: String(e?.message || e || 'fetch_error'),
      });
    }
  }

  // Failure: return 200 with debug (so it's not blank and you can see what’s wrong)
  const debug = [
    '# MovieFrost ads.txt (proxy FAILED)',
    `# time: ${new Date().toISOString()}`,
    '# Tried:',
    ...attempts.map((a) => {
      const base = `# - ${a.url} -> ${a.status || 'ERR'}`;
      const extra = a.error ? ` (${a.error})` : ` (bytes=${a.bytes || 0})`;
      return base + extra;
    }),
    '',
    '# Fix:',
    '# 1) Open Ezoic dashboard -> Ads.txt -> copy EXACT AdstxtManager URL',
    '# 2) Set it as EZOIC_ADSTXT_URL in Vercel (frontend-next project) and redeploy',
    '#    OR set EZOIC_ADSTXT_ID + EZOIC_ADSTXT_DOMAIN (make sure domain matches www vs apex)',
    '',
  ].join('\n');

  return new Response(debug, {
    status: 200,
    headers: responseHeaders({
      // cache failures for only 1 minute to avoid long-lived broken state
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
      'X-AdsTxt-Proxy': 'error',
    }),
  });
}
