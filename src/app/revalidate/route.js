// frontend-next/src/app/revalidate/route.js
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

const SECRET = String(process.env.REVALIDATE_SECRET || '').trim();

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const normalizeTag = (t) => String(t || '').trim().slice(0, 120);
const normalizePath = (p) => {
  const s = String(p || '').trim().slice(0, 300);
  if (!s) return '';
  // only allow internal paths
  if (s.startsWith('http://') || s.startsWith('https://')) return '';
  return s.startsWith('/') ? s : `/${s}`;
};

export async function POST(req) {
  try {
    if (!SECRET) {
      return NextResponse.json(
        { ok: false, error: 'REVALIDATE_SECRET is not set on frontend-next' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const headerSecret = String(req.headers.get('x-revalidate-secret') || '').trim();

    const body = await req.json().catch(() => ({}));
    const bodySecret = String(body?.secret || '').trim();

    const provided = headerSecret || bodySecret;

    if (provided !== SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    const tags = uniq((body?.tags || []).map(normalizeTag)).filter(Boolean).slice(0, 200);
    const paths = uniq((body?.paths || []).map(normalizePath)).filter(Boolean).slice(0, 200);

    // Invalidate tagged fetch caches
    for (const t of tags) revalidateTag(t);

    // Invalidate route caches (optional, but useful for / and /movies)
    for (const p of paths) revalidatePath(p);

    return NextResponse.json(
      {
        ok: true,
        revalidated: true,
        tags,
        paths,
        now: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, follow',
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e || 'revalidate_failed') },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
