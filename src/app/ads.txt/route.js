// frontend-next/src/app/ads.txt/route.js
export const runtime = 'edge';

const EZOIC_MANAGER_BASE =
  'https://srv.adstxtmanager.com';

const normalizeHost = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0];

const normalizeUrl = (value = '') => {
  const raw = String(value || '').trim();

  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }

  return `https://${raw.replace(/^\/+/, '')}`
    .replace(/\/+$/, '');
};

const parseSellerLines = (value = '') =>
  String(value || '')
    .replace(/\\n/g, '\n')
    .split(/\r?\n|\|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);

const dedupeLines = (lines = []) => {
  const out = [];
  const seen = new Set();

  for (const raw of lines) {
    const line = String(raw || '').trim();

    if (!line) continue;

    const key = line.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(line);
  }

  return out;
};

const buildLocalLines = () =>
  dedupeLines([
    ...parseSellerLines(
      process.env.ADSENSE_ADS_TXT_LINES || ''
    ),

    ...parseSellerLines(
      process.env.ADSTERRA_ADS_TXT_LINES || ''
    ),

    ...parseSellerLines(
      process.env.ADDITIONAL_ADS_TXT_LINES || ''
    ),
  ]);

const buildEzoicCandidates = (request) => {
  const exactUrl = normalizeUrl(
    process.env.EZOIC_ADSTXT_URL
  );

  if (exactUrl) {
    return [exactUrl];
  }

  const id = String(
    process.env.EZOIC_ADSTXT_ID || ''
  ).trim();

  if (!id) return [];

  let domain = normalizeHost(
    process.env.EZOIC_ADSTXT_DOMAIN
  );

  if (!domain) {
    const forwarded =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      '';

    domain = normalizeHost(forwarded);
  }

  if (!domain) {
    domain = 'www.flixmovo.online';
  }

  const variants = domain.startsWith('www.')
    ? [domain, domain.slice(4)]
    : [domain, `www.${domain}`];

  return dedupeLines(
    variants.flatMap((host) => [
      `${EZOIC_MANAGER_BASE}/${id}/${host}`,
      `${EZOIC_MANAGER_BASE}/${id}/${host}/ads.txt`,
    ])
  );
};

const fetchTextWithTimeout = async (
  url,
  timeoutMs = 7000
) => {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/plain,text/*;q=0.9,*/*;q=0.8',
      },
    });

    const text = await response.text().catch(() => '');

    if (!response.ok || !text.trim()) {
      return null;
    }

    return {
      source: url,
      text,
      status: response.status,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const responseHeaders = (extra = {}) => ({
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control':
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  'X-Robots-Tag': 'noindex, follow',
  ...extra,
});

export async function GET(request) {
  const localLines = buildLocalLines();
  const candidates = buildEzoicCandidates(request);

  let upstream = null;

  for (const candidate of candidates) {
    // Intentional sequential fallback.
    // eslint-disable-next-line no-await-in-loop
    upstream = await fetchTextWithTimeout(candidate);

    if (upstream) break;
  }

  const upstreamLines = upstream
    ? upstream.text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    : [];

  const sellerLines = dedupeLines([
    ...localLines,
    ...upstreamLines,
  ]);

  const output = [
    '# Flixmovo ads.txt',
    ...sellerLines,
    '',
  ].join('\n');

  return new Response(output, {
    status: 200,
    headers: responseHeaders({
      'X-AdsTxt-Upstream':
        upstream?.source || 'local-only',
    }),
  });
}
