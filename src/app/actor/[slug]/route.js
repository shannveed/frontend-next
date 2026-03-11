// frontend-next/src/app/actor/[slug]/route.js
export const runtime = 'edge';

const escapeHtml = (unsafe = '') =>
  String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildHeaders = () => ({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=86400, s-maxage=86400',
  'X-Robots-Tag': 'noindex, nofollow',
});

export function HEAD() {
  return new Response(null, {
    status: 410,
    headers: buildHeaders(),
  });
}

export function GET(request, { params }) {
  const origin = new URL(request.url).origin;
  const homeUrl = `${origin}/`;
  const moviesUrl = `${origin}/movies`;
  const slug = String(params?.slug || '').trim();

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>410 - Actor page removed | MovieFrost</title>
    <meta name="robots" content="noindex,nofollow" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #080A1A;
        color: #ffffff;
        font-family: Arial, sans-serif;
      }
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 640px;
        background: #0B0F29;
        border: 1px solid #4b5563;
        border-radius: 16px;
        padding: 28px;
        box-sizing: border-box;
      }
      .code {
        display: inline-block;
        background: #1B82FF;
        color: #fff;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        margin-bottom: 14px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: #C0C0C0;
        line-height: 1.7;
      }
      .slug {
        margin-top: 12px;
        color: #9CA3AF;
        font-size: 13px;
        word-break: break-word;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 22px;
      }
      .btn {
        display: inline-block;
        text-decoration: none;
        padding: 12px 18px;
        border-radius: 10px;
        font-weight: 700;
      }
      .btn-primary {
        background: #1B82FF;
        color: #fff;
      }
      .btn-secondary {
        border: 1px solid #4b5563;
        color: #fff;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="code">410 GONE</div>
        <h1>Actor page removed</h1>
        <p>
          This actor page is currently unavailable and has been removed from public access.
        </p>
        ${slug
      ? `<div class="slug">Removed page: /actor/${escapeHtml(slug)}</div>`
      : ''
    }
        <div class="actions">
          <a class="btn btn-primary" href="${escapeHtml(moviesUrl)}">Browse Movies</a>
          <a class="btn btn-secondary" href="${escapeHtml(homeUrl)}">Go Home</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: buildHeaders(),
  });
}
