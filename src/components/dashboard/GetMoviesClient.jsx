// frontend-next/src/components/dashboard/GetMoviesClient.jsx
'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import { findMoviesByNamesAdmin } from '../../lib/client/moviesLookup';

const SAMPLE = `[
  { "name": "Hijack (2026) Hindi" },
  { "name": "Ordinary Girl in a Tiara (2025)" }
]`;

const uniqClean = (arr) => {
  const cleaned = (arr || [])
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
};

const parseNamesFromInput = (raw = '') => {
  const text = String(raw || '').trim();
  if (!text) return [];

  // 1) Try JSON first
  try {
    const parsed = JSON.parse(text);

    // Array input
    if (Array.isArray(parsed)) {
      // ["A", "B"]
      if (parsed.every((x) => typeof x === 'string')) {
        return uniqClean(parsed);
      }

      // [{name:"A"}, {name:"B"}]
      if (parsed.every((x) => x && typeof x === 'object')) {
        return uniqClean(parsed.map((x) => x?.name));
      }
    }

    // Object input: { names: [...] } or { movies:[{name}...] }
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.names)) return uniqClean(parsed.names);
      if (Array.isArray(parsed.movies)) return uniqClean(parsed.movies.map((m) => m?.name));
      if (Array.isArray(parsed.items)) return uniqClean(parsed.items.map((m) => m?.name));
    }
  } catch {
    // ignore and fallback to plain text parsing
  }

  // 2) Plain text: one per line (also supports comma-separated on same line)
  const lines = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((s) => s.trim());

  return uniqClean(lines);
};

const shortId = (id) => String(id || '').slice(0, 8).toUpperCase();

export default function GetMoviesClient() {
  return (
    <RequireAdmin>
      {(user) => <GetMoviesInner token={user.token} />}
    </RequireAdmin>
  );
}

function GetMoviesInner({ token }) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState('exact'); // exact | startsWith | contains
  const [includeReviews, setIncludeReviews] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const parsedNames = useMemo(() => parseNamesFromInput(raw), [raw]);

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
    const names = parseNamesFromInput(raw);

    if (!names.length) {
      toast.error('Paste at least one movie/web-series name.');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const data = await findMoviesByNamesAdmin(token, names, {
        mode,
        includeReviews,
      });

      setResult(data);

      toast.success(
        `Matched ${Number(data?.matchedCount || 0)} document(s). Not found: ${Number(
          data?.notFoundCount || 0
        )}`
      );
    } catch (e) {
      toast.error(e?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const moviesJson = useMemo(() => {
    if (!result?.movies) return '';
    return JSON.stringify(result.movies, null, 2);
  }, [result]);

  const inputClass =
    'w-full bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple';

  return (
    <SideBarShell>
      <div className="text-white flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Get Movies</h2>
            <p className="text-sm text-dryGray mt-1">
              Paste movie/web-series names and fetch matching MongoDB documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRaw(SAMPLE)}
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
              {loading ? 'Searching...' : 'Get Movies'}
            </button>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-4 text-sm text-dryGray">
          <p className="text-white font-semibold mb-2">Input formats supported:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>One name per line</li>
            <li>
              JSON array: <code className="text-white">["A","B"]</code>
            </li>
            <li>
              JSON objects: <code className="text-white">[{`{ "name": "A" }`}]</code>
            </li>
          </ul>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`Example:\nHijack (2026) Hindi\nOrdinary Girl in a Tiara (2025)\n\nor JSON:\n${SAMPLE}`}
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

          <label className="flex items-center gap-2 mt-6 sm:mt-0">
            <input
              type="checkbox"
              checked={includeReviews}
              onChange={(e) => setIncludeReviews(e.target.checked)}
              className="accent-customPurple"
            />
            <span className="text-sm text-white">
              Include reviews (bigger response)
            </span>
          </label>

          <div className="text-sm mt-6 sm:mt-0">
            <span className="text-dryGray">Parsed names:</span>{' '}
            <span className="text-white font-semibold">{parsedNames.length}</span>
          </div>
        </div>

        {/* Results */}
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

            {Array.isArray(result.notFound) && result.notFound.length > 0 ? (
              <div className="bg-main border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">Not Found</p>
                  <button
                    type="button"
                    onClick={() => copyText(result.notFound.join('\n'))}
                    className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                  >
                    Copy Not Found
                  </button>
                </div>

                <ul className="mt-2 text-xs text-dryGray list-disc ml-5 space-y-1">
                  {result.notFound.slice(0, 200).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>

                {result.notFound.length > 200 ? (
                  <p className="text-xs text-dryGray mt-2">
                    Showing first 200 not-found items.
                  </p>
                ) : null}
              </div>
            ) : null}

            {Array.isArray(result.movies) && result.movies.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(moviesJson)}
                    className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                  >
                    Copy JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadJson(`get-movies-${Date.now()}.json`, result.movies)}
                    className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
                  >
                    Download JSON
                  </button>
                </div>

                {/* Simple table summary */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border">
                    <thead className="bg-main">
                      <tr>
                        <th className="text-left p-3 border-b border-border">Name</th>
                        <th className="text-left p-3 border-b border-border">Type</th>
                        <th className="text-left p-3 border-b border-border">Year</th>
                        <th className="text-left p-3 border-b border-border">Published</th>
                        <th className="text-left p-3 border-b border-border">Slug</th>
                        <th className="text-left p-3 border-b border-border">Id</th>
                        <th className="text-right p-3 border-b border-border">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-dry">
                      {result.movies.map((m) => {
                        const seg = m.slug || m._id;
                        return (
                          <tr key={m._id} className="border-b border-border/50">
                            <td className="p-3">{m.name}</td>
                            <td className="p-3">{m.type}</td>
                            <td className="p-3">{m.year}</td>
                            <td className="p-3">
                              {m.isPublished === false ? (
                                <span className="text-red-400">Draft</span>
                              ) : (
                                <span className="text-green-400">Published</span>
                              )}
                            </td>
                            <td className="p-3">{m.slug || '-'}</td>
                            <td className="p-3">{shortId(m._id)}</td>
                            <td className="p-3 text-right space-x-2">
                              <a
                                href={`/movie/${seg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                              >
                                Movie
                              </a>
                              <a
                                href={`/watch/${seg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition inline-block"
                              >
                                Watch
                              </a>
                              <button
                                type="button"
                                onClick={() => copyText(JSON.stringify(m, null, 2))}
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

                {/* Full JSON */}
                <details className="bg-main border border-border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Raw JSON (full documents)
                  </summary>
                  <pre className="text-xs text-white/90 whitespace-pre-wrap mt-3">
                    {moviesJson}
                  </pre>
                </details>
              </>
            ) : (
              <p className="text-border text-sm">
                No documents matched your input.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </SideBarShell>
  );
}
