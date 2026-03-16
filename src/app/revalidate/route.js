// frontend-next/src/app/revalidate/route.js
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

const SECRET = String(process.env.REVALIDATE_SECRET || '').trim();

const uniqStrings = (arr) =>
  Array.from(new Set((arr || []).filter(Boolean)));

const normalizeTag = (t) => String(t || '').trim().slice(0, 120);

const normalizePathValue = (p) => {
  const s = String(p || '').trim().slice(0, 300);
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return '';
  return s.startsWith('/') ? s : `/${s}`;
};

const normalizePathEntry = (entry) => {
  if (typeof entry === 'string') {
    const path = normalizePathValue(entry);
    return path ? { path } : null;
  }

  if (entry && typeof entry === 'object') {
    const path = normalizePathValue(entry.path || entry.pathname || '');
    if (!path) return null;

    const rawType = String(entry.type || '').trim().toLowerCase();
    const type =
      rawType === 'page' || rawType === 'layout' ? rawType : undefined;

    return type ? { path, type } : { path };
  }

  return null;
};

const uniqPathEntries = (arr = []) => {
  const map = new Map();

  for (const raw of arr || []) {
    const entry = normalizePathEntry(raw);
    if (!entry) continue;

    const key = `${entry.path}::${entry.type || ''}`;
    if (!map.has(key)) {
      map.set(key, entry);
    }
  }

  return Array.from(map.values());
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

    const tags = uniqStrings((body?.tags || []).map(normalizeTag))
      .filter(Boolean)
      .slice(0, 200);

    const pathEntries = uniqPathEntries(body?.paths || []).slice(0, 500);

    // Invalidate tagged fetch caches
    for (const t of tags) revalidateTag(t);

    // Invalidate route caches
    for (const entry of pathEntries) {
      if (entry.type) {
        revalidatePath(entry.path, entry.type);
      } else {
        revalidatePath(entry.path);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        revalidated: true,
        tags,
        paths: pathEntries,
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
