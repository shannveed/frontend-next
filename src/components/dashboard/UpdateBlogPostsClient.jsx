// frontend-next/src/components/dashboard/UpdateBlogPostsClient.jsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';

import {
  buildBlogPostPath,
  formatBlogTemplateType,
} from '../../lib/blogCategories';
import { findBlogPostsByTitlesAdmin } from '../../lib/client/blogLookup';
import { bulkExactUpdateBlogPostsAdmin } from '../../lib/client/blogAdmin';

const SAMPLE_INPUT = `Interstellar Ending Explained
Top 10 Mind-Bending Movies Like Avengers`;

const uniqClean = (arr) => {
  const cleaned = (arr || [])
    .map((x) => String(x || '').trim())
    .filter(Boolean);

  return [...new Set(cleaned)];
};

const parseTitlesFromInput = (raw = '') => {
  const text = String(raw || '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      if (parsed.every((x) => typeof x === 'string')) {
        return uniqClean(parsed);
      }

      if (parsed.every((x) => x && typeof x === 'object')) {
        return uniqClean(parsed.map((x) => x?.title));
      }
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.titles)) return uniqClean(parsed.titles);
      if (Array.isArray(parsed.posts))
        return uniqClean(parsed.posts.map((p) => p?.title));
      if (Array.isArray(parsed.items))
        return uniqClean(parsed.items.map((p) => p?.title));
      if (typeof parsed.text === 'string')
        return uniqClean(parsed.text.split(/\r?\n/));
    }
  } catch {
    // fallback to plain text
  }

  const lines = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((s) => s.trim());

  return uniqClean(lines);
};

const shortId = (id) => String(id || '').slice(0, 8).toUpperCase();

const formatDate = (value) => {
  if (!value) return '-';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const toIsoOrNull = (value) => {
  if (!value) return null;

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const normalizeIdList = (values) => {
  const list = Array.isArray(values) ? values : [];

  return Array.from(
    new Set(
      list
        .map((item) => {
          if (item && typeof item === 'object') return item._id || item.id;
          return item;
        })
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
};

const normalizeSectionsForEditor = (sections) => {
  const list = Array.isArray(sections) ? sections : [];

  return list.map((section) => ({
    heading: String(section?.heading || ''),
    image: String(section?.image || ''),
    imageAlt: String(section?.imageAlt || ''),
    body: String(section?.body || ''),
    movieLinkText: String(section?.movieLinkText || ''),
    movieLinkUrl: String(section?.movieLinkUrl || ''),
  }));
};

const normalizeFaqsForEditor = (faqs) => {
  const list = Array.isArray(faqs) ? faqs : [];

  return list.map((faq) => ({
    question: String(faq?.question || ''),
    answer: String(faq?.answer || ''),
  }));
};

const toEditableDoc = (post) => ({
  _id: post?._id,
  title: String(post?.title || ''),
  categorySlug: String(post?.categorySlug || ''),
  templateType: String(post?.templateType || 'list'),

  coverImage: String(post?.coverImage || ''),
  coverImageAlt: String(post?.coverImageAlt || ''),
  excerpt: String(post?.excerpt || ''),
  intro: String(post?.intro || ''),
  quickAnswer: String(post?.quickAnswer || ''),

  sections: normalizeSectionsForEditor(post?.sections),
  faqs: normalizeFaqsForEditor(post?.faqs),

  tags: Array.isArray(post?.tags) ? post.tags : [],
  relatedMovieIds: normalizeIdList(post?.relatedMovieIds),
  relatedPostIds: normalizeIdList(post?.relatedPostIds).filter(
    (id) => id !== String(post?._id || '')
  ),

  authorName: String(post?.authorName || 'MovieFrost Editorial Team'),

  seoTitle: String(post?.seoTitle || ''),
  seoDescription: String(post?.seoDescription || ''),
  seoKeywords: String(post?.seoKeywords || ''),

  isTrending: !!post?.isTrending,
  isPublished: !!post?.isPublished,
  publishedAt: toIsoOrNull(post?.publishedAt),
});

export default function UpdateBlogPostsClient() {
  return (
    <RequireAdmin>
      {(user) => <UpdateBlogPostsInner token={user.token} />}
    </RequireAdmin>
  );
}

function UpdateBlogPostsInner({ token }) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState('exact');
  const [requireId, setRequireId] = useState(true);

  const [finding, setFinding] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  const [editorJson, setEditorJson] = useState('');
  const [editorError, setEditorError] = useState('');

  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const parsedTitles = useMemo(() => parseTitlesFromInput(raw), [raw]);

  const foundPosts = Array.isArray(lookupResult?.posts) ? lookupResult.posts : [];
  const notFound = Array.isArray(lookupResult?.notFound) ? lookupResult.notFound : [];

  const handleUseSample = () => {
    setRaw(SAMPLE_INPUT);
    setLookupResult(null);
    setEditorJson('');
    setEditorError('');
    setUpdateResult(null);
  };

  const handleClear = () => {
    setRaw('');
    setLookupResult(null);
    setEditorJson('');
    setEditorError('');
    setUpdateResult(null);
  };

  const handleLookup = async () => {
    const titles = parseTitlesFromInput(raw);

    if (!titles.length) {
      toast.error('Paste at least one blog title.');
      return;
    }

    try {
      setFinding(true);
      setLookupResult(null);
      setUpdateResult(null);
      setEditorError('');

      const data = await findBlogPostsByTitlesAdmin(token, titles, { mode });

      setLookupResult(data);

      const editable = Array.isArray(data?.posts)
        ? data.posts.map(toEditableDoc)
        : [];

      setEditorJson(JSON.stringify(editable, null, 2));

      toast.success(
        `Matched ${Number(data?.matchedCount || 0)} post(s). Not found: ${Number(
          data?.notFoundCount || 0
        )}`
      );
    } catch (e) {
      toast.error(e?.message || 'Lookup failed');
    } finally {
      setFinding(false);
    }
  };

  const formatEditor = () => {
    const t = String(editorJson || '').trim();
    if (!t) return;

    try {
      const parsed = JSON.parse(t);
      setEditorJson(JSON.stringify(parsed, null, 2));
      setEditorError('');
      toast.success('Formatted editor JSON');
    } catch (e) {
      setEditorError(e?.message || 'Invalid JSON');
      toast.error('Editor JSON is invalid');
    }
  };

  const parseEditorPosts = () => {
    const t = String(editorJson || '').trim();
    if (!t) return [];

    const parsed = JSON.parse(t);
    const posts = Array.isArray(parsed) ? parsed : parsed?.posts;

    if (!Array.isArray(posts)) {
      throw new Error(
        'Editor JSON must be either an array OR an object: { "posts": [ ... ] }'
      );
    }

    return posts;
  };

  const handleUpdate = async () => {
    let posts = [];

    try {
      posts = parseEditorPosts();

      if (!posts.length) {
        throw new Error('Editor posts array is empty.');
      }

      for (let i = 0; i < posts.length; i += 1) {
        const item = posts[i] || {};

        const id = String(item?._id || '').trim();
        const title = String(item?.title || '').trim();
        const categorySlug = String(item?.categorySlug || '').trim();

        if (!title) throw new Error(`Row ${i + 1}: missing "title"`);
        if (!categorySlug) throw new Error(`Row ${i + 1}: missing "categorySlug"`);

        if (requireId && !id) {
          throw new Error(
            `Row ${i + 1}: missing "_id". Keep "_id" for safe updates, especially if you edit title/categorySlug.`
          );
        }
      }

      setEditorError('');
    } catch (e) {
      setEditorError(e?.message || 'Invalid JSON');
      toast.error(e?.message || 'Invalid editor JSON');
      return;
    }

    try {
      setUpdating(true);
      setUpdateResult(null);

      const res = await bulkExactUpdateBlogPostsAdmin(token, posts);

      setUpdateResult(res);

      toast.success(
        `Update done. Matched: ${res?.matched || 0}, Modified: ${res?.modified || 0
        }, Errors: ${res?.errorsCount || 0}`
      );
    } catch (e) {
      toast.error(e?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SideBarShell>
      <div className="text-white flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold">Update Blog Posts</h2>
          <p className="text-sm text-dryGray mt-1">
            1) Paste blog titles → 2) Fetch documents → 3) Edit JSON → 4) Bulk update via{' '}
            <code className="text-white">PUT /api/blog/admin/bulk-exact</code>
          </p>
          <p className="text-xs text-dryGray mt-2">
            Keep <code className="text-white">_id</code> in the JSON for safe updates.
            If multiple posts share a similar title, updating by title only can become ambiguous.
          </p>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste blog titles (one per line) OR JSON array..."
          className="w-full min-h-[220px] bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple"
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-border">Match Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple mt-2"
            >
              <option value="exact">Exact (case-insensitive)</option>
              <option value="startsWith">Starts with</option>
              <option value="contains">Contains</option>
            </select>
          </div>

          <label className="flex items-center gap-2 mt-6 sm:mt-0">
            <input
              type="checkbox"
              checked={requireId}
              onChange={(e) => setRequireId(e.target.checked)}
              className="accent-customPurple"
            />
            <span className="text-sm text-white">
              Require <code className="text-white">_id</code> for updates
            </span>
          </label>

          <div className="text-sm mt-6 sm:mt-0">
            <span className="text-dryGray">Parsed titles:</span>{' '}
            <span className="text-white font-semibold">{parsedTitles.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUseSample}
            className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm"
          >
            Use Sample
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleLookup}
            disabled={finding}
            className="ml-auto px-6 py-2 rounded bg-customPurple hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
          >
            {finding ? 'Searching...' : 'Get Blog Posts'}
          </button>
        </div>

        {lookupResult ? (
          <div className="bg-dry border border-border rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <p>
                Matched:{' '}
                <span className="text-green-500 font-semibold">
                  {lookupResult.matchedCount || 0}
                </span>
              </p>
              <p>
                Not found:{' '}
                <span className="text-red-500 font-semibold">
                  {lookupResult.notFoundCount || 0}
                </span>
              </p>
              <p className="text-dryGray">
                Unique input: {lookupResult.uniqueCount || 0}
              </p>
            </div>

            {notFound.length ? (
              <details className="bg-main border border-border rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Not Found ({notFound.length})
                </summary>

                <ul className="mt-3 text-xs text-dryGray list-disc ml-5 space-y-1">
                  {notFound.slice(0, 200).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {foundPosts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border">
                  <thead className="bg-main">
                    <tr>
                      <th className="text-left p-3 border-b border-border">Title</th>
                      <th className="text-left p-3 border-b border-border">Category</th>
                      <th className="text-left p-3 border-b border-border">Template</th>
                      <th className="text-left p-3 border-b border-border">Published</th>
                      <th className="text-left p-3 border-b border-border">Slug</th>
                      <th className="text-left p-3 border-b border-border">Id</th>
                      <th className="text-right p-3 border-b border-border">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-dry">
                    {foundPosts.map((post) => {
                      const publicHref =
                        post?.isPublished && post?.categorySlug && post?.slug
                          ? buildBlogPostPath(post.categorySlug, post.slug)
                          : '';

                      const previewHref = `/blog-preview/${post._id}`;
                      const editHref = `/blog-posts/edit/${post._id}`;

                      return (
                        <tr key={post._id} className="border-b border-border/50">
                          <td className="p-3">{post.title}</td>
                          <td className="p-3">{post.categoryTitle || post.categorySlug}</td>
                          <td className="p-3">
                            {formatBlogTemplateType(post.templateType)}
                          </td>
                          <td className="p-3">
                            {post.isPublished ? (
                              <span className="text-green-400">Published</span>
                            ) : (
                              <span className="text-red-400">Draft</span>
                            )}
                          </td>
                          <td className="p-3">{post.slug || '-'}</td>
                          <td className="p-3">{shortId(post._id)}</td>
                          <td className="p-3 text-right space-x-2">
                            <Link
                              href={editHref}
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                            >
                              Edit
                            </Link>

                            <Link
                              href={previewHref}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                            >
                              Preview
                            </Link>

                            {publicHref ? (
                              <Link
                                href={publicHref}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition inline-block"
                              >
                                View
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-border text-sm">No documents matched your input.</p>
            )}
          </div>
        ) : null}

        {foundPosts.length ? (
          <div className="bg-dry border border-border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">Editable Update JSON</h3>

              <button
                type="button"
                onClick={formatEditor}
                className="ml-auto px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
              >
                Format JSON
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={updating}
                className="px-4 py-2 text-sm rounded bg-customPurple hover:bg-opacity-90 transition font-semibold disabled:opacity-60"
              >
                {updating ? 'Updating...' : 'Update Blog Posts'}
              </button>
            </div>

            {editorError ? (
              <p className="text-red-400 text-xs">Editor error: {editorError}</p>
            ) : null}

            <textarea
              value={editorJson}
              onChange={(e) => {
                setEditorJson(e.target.value);
                if (editorError) setEditorError('');
              }}
              className="w-full min-h-[60vh] bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple"
              spellCheck={false}
            />

            <div className="text-xs text-dryGray">
              This JSON is sent to:{' '}
              <code className="text-white">PUT /api/blog/admin/bulk-exact</code>
            </div>

            {updateResult ? (
              <div className="bg-main border border-border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  <p>
                    Matched:{' '}
                    <span className="text-white font-semibold">
                      {updateResult.matched || 0}
                    </span>
                  </p>
                  <p>
                    Modified:{' '}
                    <span className="text-green-500 font-semibold">
                      {updateResult.modified || 0}
                    </span>
                  </p>
                  <p>
                    Errors:{' '}
                    <span className="text-red-500 font-semibold">
                      {updateResult.errorsCount || 0}
                    </span>
                  </p>
                </div>

                {Array.isArray(updateResult.errors) && updateResult.errors.length ? (
                  <details className="bg-dry border border-border rounded p-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      View Errors
                    </summary>

                    <pre className="text-xs text-red-300 whitespace-pre-wrap mt-2">
                      {JSON.stringify(updateResult.errors, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {lookupResult && !foundPosts.length && !finding ? (
          <div className="bg-main border border-border rounded-lg p-4 text-sm text-dryGray">
            No blog posts were found for the provided titles.
          </div>
        ) : null}

        <div className="bg-main border border-border rounded-lg p-4 text-xs text-dryGray">
          <p className="text-white font-semibold mb-2">Safe update tips</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Keep <code className="text-white">_id</code> in each row.</li>
            <li>
              If you change <code className="text-white">title</code> or{' '}
              <code className="text-white">categorySlug</code>, backend will regenerate the slug automatically.
            </li>
            <li>
              <code className="text-white">sections</code>,{' '}
              <code className="text-white">faqs</code>,{' '}
              <code className="text-white">relatedMovieIds</code>, and{' '}
              <code className="text-white">relatedPostIds</code> can be cleared by setting empty arrays.
            </li>
            <li>
              <code className="text-white">publishedAt</code> can be an ISO string or <code className="text-white">null</code>.
            </li>
          </ul>
        </div>
      </div>
    </SideBarShell>
  );
}
