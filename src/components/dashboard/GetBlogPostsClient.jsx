// frontend-next/src/components/dashboard/GetBlogPostsClient.jsx
'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import {
  buildBlogPostPath,
  formatBlogTemplateType,
} from '../../lib/blogCategories';
import { findBlogPostsByTitlesAdmin } from '../../lib/client/blogLookup';

const SAMPLE = `[
  { "title": "Top 10 Mind-Bending Movies Like Avengers" },
  { "title": "Interstellar Ending Explained" }
]`;

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

export default function GetBlogPostsClient() {
  return (
    <RequireAdmin>
      {(user) => <GetBlogPostsInner token={user.token} />}
    </RequireAdmin>
  );
}

function GetBlogPostsInner({ token }) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState('exact');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const parsedTitles = useMemo(() => parseTitlesFromInput(raw), [raw]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      toast.success('Copied');
    } catch {
      toast.error('Copy failed (browser blocked clipboard)');
    }
  };

  const downloadJson = (filename, data) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleLookup = async () => {
    const titles = parseTitlesFromInput(raw);

    if (!titles.length) {
      toast.error('Paste at least one blog title.');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const data = await findBlogPostsByTitlesAdmin(token, titles, { mode });

      setResult(data);

      toast.success(
        `Matched ${Number(data?.matchedCount || 0)} post(s). Not found: ${Number(
          data?.notFoundCount || 0
        )}`
      );
    } catch (e) {
      toast.error(e?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const postsJson = useMemo(() => {
    if (!result?.posts) return '';
    return JSON.stringify(result.posts, null, 2);
  }, [result]);

  const posts = Array.isArray(result?.posts) ? result.posts : [];
  const notFound = Array.isArray(result?.notFound) ? result.notFound : [];

  const inputClass =
    'w-full bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple';

  return (
    <SideBarShell>
      <div className="text-white flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Get Blog Posts</h2>
            <p className="text-sm text-dryGray mt-1">
              Paste blog post titles and fetch matching MongoDB blog documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRaw(SAMPLE);
                setResult(null);
              }}
              className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm"
            >
              Use Sample
            </button>

            <button
              type="button"
              onClick={() => {
                setRaw('');
                setResult(null);
              }}
              className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleLookup}
              disabled={loading}
              className="px-6 py-2 rounded bg-customPurple hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Get Blog Posts'}
            </button>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-4 text-sm text-dryGray">
          <p className="text-white font-semibold mb-2">Input formats supported:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>One title per line</li>
            <li>
              JSON array: <code className="text-white">["Title 1","Title 2"]</code>
            </li>
            <li>
              JSON objects:{' '}
              <code className="text-white">[{`{ "title": "Title 1" }`}]</code>
            </li>
          </ul>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`Example:\nInterstellar Ending Explained\nTop 10 Mind-Bending Movies Like Avengers\n\nor JSON:\n${SAMPLE}`}
          className={inputClass}
          rows={12}
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

          <div className="text-sm mt-6 sm:mt-0">
            <span className="text-dryGray">Parsed titles:</span>{' '}
            <span className="text-white font-semibold">{parsedTitles.length}</span>
          </div>
        </div>

        {result ? (
          <div className="bg-dry border border-border rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <p>
                Matched:{' '}
                <span className="text-green-500 font-semibold">
                  {result.matchedCount || 0}
                </span>
              </p>
              <p>
                Not found:{' '}
                <span className="text-red-500 font-semibold">
                  {result.notFoundCount || 0}
                </span>
              </p>
              <p className="text-dryGray">
                Unique input: {result.uniqueCount || 0}
              </p>
            </div>

            {notFound.length > 0 ? (
              <div className="bg-main border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">Not Found</p>
                  <button
                    type="button"
                    onClick={() => copyText(notFound.join('\n'))}
                    className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                  >
                    Copy Not Found
                  </button>
                </div>

                <ul className="mt-2 text-xs text-dryGray list-disc ml-5 space-y-1">
                  {notFound.slice(0, 200).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>

                {notFound.length > 200 ? (
                  <p className="text-xs text-dryGray mt-2">
                    Showing first 200 not-found items.
                  </p>
                ) : null}
              </div>
            ) : null}

            {posts.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(postsJson)}
                    className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                  >
                    Copy JSON
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(`get-blog-posts-${Date.now()}.json`, posts)
                    }
                    className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border">
                    <thead className="bg-main text-white">
                      <tr>
                        <th className="text-left p-3 border-b border-border">Title</th>
                        <th className="text-left p-3 border-b border-border">Category</th>
                        <th className="text-left p-3 border-b border-border">Template</th>
                        <th className="text-left p-3 border-b border-border">Published</th>
                        <th className="text-left p-3 border-b border-border">Views</th>
                        <th className="text-left p-3 border-b border-border">Slug</th>
                        <th className="text-left p-3 border-b border-border">Id</th>
                        <th className="text-right p-3 border-b border-border">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-dry">
                      {posts.map((p) => {
                        const publicHref =
                          p?.isPublished && p?.categorySlug && p?.slug
                            ? buildBlogPostPath(p.categorySlug, p.slug)
                            : '';
                        const previewHref = `/blog-preview/${p._id}`;
                        const editHref = `/blog-posts/edit/${p._id}`;

                        return (
                          <tr key={p._id} className="border-b border-border/50">
                            <td className="p-3">
                              <div className="max-w-[300px]">
                                <p className="text-white font-semibold line-clamp-2">
                                  {p.title}
                                </p>
                                <p className="text-[11px] text-dryGray mt-1">
                                  {formatDate(p.publishedAt || p.createdAt)}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">{p.categoryTitle || p.categorySlug}</td>
                            <td className="p-3">
                              {formatBlogTemplateType(p.templateType)}
                            </td>
                            <td className="p-3">
                              {p.isPublished ? (
                                <span className="text-green-400">Published</span>
                              ) : (
                                <span className="text-red-400">Draft</span>
                              )}
                            </td>
                            <td className="p-3">
                              {Number(p.viewCount || 0).toLocaleString()}
                            </td>
                            <td className="p-3">{p.slug || '-'}</td>
                            <td className="p-3">{shortId(p._id)}</td>
                            <td className="p-3 text-right space-x-2">
                              <a
                                href={editHref}
                                className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                              >
                                Edit
                              </a>

                              <a
                                href={previewHref}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                              >
                                Preview
                              </a>

                              {publicHref ? (
                                <a
                                  href={publicHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition inline-block"
                                >
                                  View
                                </a>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => copyText(JSON.stringify(p, null, 2))}
                                className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                              >
                                Copy Doc
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <details className="bg-main border border-border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Raw JSON (full documents)
                  </summary>
                  <pre className="text-xs text-white/90 whitespace-pre-wrap mt-3">
                    {postsJson}
                  </pre>
                </details>
              </>
            ) : (
              <p className="text-border text-sm">
                No blog posts matched your input.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </SideBarShell>
  );
}
