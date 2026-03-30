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

const buildEntryKey = (entry) =>
  `${String(entry?.path || '')}::${String(entry?.type || '')}`;

const pushUniqueEntry = (list, seen, entry) => {
  const path = normalizePath(entry?.path);
  if (!path) return;

  const type =
    entry?.type === 'page' || entry?.type === 'layout'
      ? entry.type
      : undefined;

  const key = `${path}::${type || ''}`;
  if (seen.has(key)) return;

  seen.add(key);
  list.push({ path, ...(type ? { type } : {}) });
};

/**
 * IMPORTANT:
 * Tag revalidation is good, but paginated SEO routes like:
 * - /movies/type/movie/page/39
 * can still stay stale when they were previously generated as static pages.
 *
 * So when backend sends the high-level "movies" tag, we ALSO explicitly
 * revalidate all movie listing route patterns.
 */
const expandPathsFromTags = (tags = []) => {
  const keys = new Set(tags.map((t) => normalizeTag(t).toLowerCase()));
  const out = [];
  const seen = new Set();

  if (keys.has('home')) {
    pushUniqueEntry(out, seen, { path: '/' });
  }

  if (
    keys.has('movies') ||
    keys.has('categories') ||
    keys.has('browsebydistinct')
  ) {
    // Generic listing pages
    pushUniqueEntry(out, seen, { path: '/movies' });
    pushUniqueEntry(out, seen, { path: '/movies/page/[page]', type: 'page' });

    // Type pages
    pushUniqueEntry(out, seen, { path: '/movies/type/[type]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/movies/type/[type]/page/[page]',
      type: 'page',
    });

    // Genre pages
    pushUniqueEntry(out, seen, { path: '/genre/[slug]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/genre/[slug]/page/[page]',
      type: 'page',
    });

    // Industry pages
    pushUniqueEntry(out, seen, { path: '/industry/[slug]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/industry/[slug]/page/[page]',
      type: 'page',
    });

    // Language pages
    pushUniqueEntry(out, seen, { path: '/language/[slug]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/language/[slug]/page/[page]',
      type: 'page',
    });

    // Year pages
    pushUniqueEntry(out, seen, { path: '/year/[year]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/year/[year]/page/[page]',
      type: 'page',
    });
  }

  // ✅ Blog pages
  if (keys.has('blog')) {
    pushUniqueEntry(out, seen, { path: '/blog' });
    pushUniqueEntry(out, seen, { path: '/blog/trending-articles' });
    pushUniqueEntry(out, seen, { path: '/blog/[category]', type: 'page' });
    pushUniqueEntry(out, seen, {
      path: '/blog/[category]/[slug]',
      type: 'page',
    });
  }

  if (keys.has('blog-trending')) {
    pushUniqueEntry(out, seen, { path: '/blog/trending-articles' });
  }

  for (const key of keys) {
    if (key.startsWith('blog-category:')) {
      const slug = String(key.slice('blog-category:'.length) || '').trim();
      if (slug) {
        pushUniqueEntry(out, seen, { path: `/blog/${slug}` });
      }
    }
  }

  return out;
};

const safeRevalidatePath = (entry, applied) => {
  const path = normalizePath(entry?.path);
  if (!path) return;

  const type =
    entry?.type === 'page' || entry?.type === 'layout'
      ? entry.type
      : undefined;

  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);

    applied.push(type ? `${path} (${type})` : path);
  } catch {
    // ignore single path failures
  }
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

    const tags = uniq((body?.tags || []).map(normalizeTag))
      .filter(Boolean)
      .slice(0, 200);

    const directPathEntries = [];
    const directSeen = new Set();

    for (const raw of body?.paths || []) {
      const path = normalizePath(raw);
      if (!path) continue;
      pushUniqueEntry(directPathEntries, directSeen, { path });
    }

    // Invalidate tagged fetch caches
    for (const t of tags) revalidateTag(t);

    // Expand route revalidation from tags
    const expandedEntries = expandPathsFromTags(tags);

    // Merge + dedupe
    const merged = [];
    const mergedSeen = new Set();

    for (const entry of [...directPathEntries, ...expandedEntries]) {
      const key = buildEntryKey(entry);
      if (!entry?.path || mergedSeen.has(key)) continue;
      mergedSeen.add(key);
      merged.push(entry);
    }

    const appliedPaths = [];
    for (const entry of merged) {
      safeRevalidatePath(entry, appliedPaths);
    }

    return NextResponse.json(
      {
        ok: true,
        revalidated: true,
        tags,
        directPaths: directPathEntries.map((p) =>
          p.type ? `${p.path} (${p.type})` : p.path
        ),
        expandedPaths: expandedEntries.map((p) =>
          p.type ? `${p.path} (${p.type})` : p.path
        ),
        appliedPaths,
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
