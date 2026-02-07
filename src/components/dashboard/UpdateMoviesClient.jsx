'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';

import { findMoviesByNamesAdmin } from '../../lib/client/moviesLookup';
import { bulkExactUpdateMoviesAdmin } from '../../lib/client/moviesAdmin';

const SAMPLE_INPUT = `Hijack (2026) Hindi
Ordinary Girl in a Tiara (2025)`;

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

    // Object input: { names: [...] } or { movies:[{name}...] } or { items:[{name}...] }
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.names)) return uniqClean(parsed.names);
      if (Array.isArray(parsed.movies))
        return uniqClean(parsed.movies.map((m) => m?.name));
      if (Array.isArray(parsed.items))
        return uniqClean(parsed.items.map((m) => m?.name));
      if (typeof parsed.text === 'string')
        return uniqClean(parsed.text.split(/\r?\n/));
    }
  } catch {
    // ignore and fallback
  }

  // 2) Plain text: one per line (+ comma split support)
  const lines = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((s) => s.trim());

  return uniqClean(lines);
};

const shortId = (id) => String(id || '').slice(0, 8).toUpperCase();

const normalizeFaqsForEditor = (faqs) => {
  const list = Array.isArray(faqs) ? faqs : [];
  return list
    .map((f) => ({
      question: String(f?.question || '').trim(),
      answer: String(f?.answer || '').trim(),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 5);
};

/**
 * Build a SAFE editable payload for PUT /api/movies/bulk-exact
 * We intentionally DO NOT include: rate, numberOfReviews, reviews, viewCount, externalRatings, etc.
 *
 * ✅ FIXED: include trailerUrl + faqs so Update Movies can edit them.
 */
const toEditableDoc = (m) => {
  const type = String(m?.type || 'Movie');

  const base = {
    _id: m?._id,
    type,
    name: String(m?.name || ''),
    desc: String(m?.desc || ''),

    image: String(m?.image || ''),
    titleImage: String(m?.titleImage || ''),

    category: String(m?.category || ''),
    browseBy: String(m?.browseBy || ''),
    thumbnailInfo: String(m?.thumbnailInfo || ''),

    language: String(m?.language || ''),
    year: typeof m?.year === 'number' ? m.year : Number(m?.year) || 0,
    time: typeof m?.time === 'number' ? m.time : Number(m?.time) || 0,

    director: String(m?.director || ''),
    imdbId: String(m?.imdbId || ''),

    casts: Array.isArray(m?.casts) ? m.casts : [],

    // ✅ NEW
    trailerUrl: String(m?.trailerUrl || ''),
    faqs: normalizeFaqsForEditor(m?.faqs),

    seoTitle: String(m?.seoTitle || ''),
    seoDescription: String(m?.seoDescription || ''),
    seoKeywords: String(m?.seoKeywords || ''),

    latest: !!m?.latest,
    previousHit: !!m?.previousHit,

    // missing isPublished is treated as published across your public endpoints
    isPublished: m?.isPublished !== false,
  };

  if (type === 'WebSeries') {
    base.episodes = Array.isArray(m?.episodes) ? m.episodes : [];
  } else {
    // Movie
    base.video = String(m?.video || '');
    base.videoUrl2 = String(m?.videoUrl2 || '');
    base.videoUrl3 = String(m?.videoUrl3 || '');
    base.downloadUrl = String(m?.downloadUrl || '');
  }

  return base;
};

export default function UpdateMoviesClient() {
  return (
    <RequireAdmin>{(user) => <UpdateMoviesInner token={user.token} />}</RequireAdmin>
  );
}

function UpdateMoviesInner({ token }) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState('exact'); // exact | startsWith | contains
  const [includeReviews, setIncludeReviews] = useState(false);

  // Safety: force updates by _id (recommended)
  const [requireId, setRequireId] = useState(true);

  const [finding, setFinding] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  const [editorJson, setEditorJson] = useState('');
  const [editorError, setEditorError] = useState('');

  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const parsedNames = useMemo(() => parseNamesFromInput(raw), [raw]);

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
    const names = parseNamesFromInput(raw);

    if (!names.length) {
      toast.error('Paste at least one movie/web-series name.');
      return;
    }

    try {
      setFinding(true);
      setLookupResult(null);
      setUpdateResult(null);
      setEditorError('');

      const data = await findMoviesByNamesAdmin(token, names, {
        mode,
        includeReviews,
      });

      setLookupResult(data);

      const editable = Array.isArray(data?.movies)
        ? data.movies.map(toEditableDoc)
        : [];

      setEditorJson(JSON.stringify(editable, null, 2));

      toast.success(
        `Matched ${Number(data?.matchedCount || 0)} doc(s). Not found: ${Number(
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

  const parseEditorMovies = () => {
    const t = String(editorJson || '').trim();
    if (!t) return [];

    const parsed = JSON.parse(t);
    const movies = Array.isArray(parsed) ? parsed : parsed?.movies;

    if (!Array.isArray(movies)) {
      throw new Error(
        'Editor JSON must be either an array OR an object: { "movies": [ ... ] }'
      );
    }

    return movies;
  };

  const handleUpdate = async () => {
    let movies = [];
    try {
      movies = parseEditorMovies();
    } catch (e) {
      setEditorError(e?.message || 'Invalid JSON');
      toast.error(e?.message || 'Invalid editor JSON');
      return;
    }

    if (!movies.length) {
      toast.error('Editor movies array is empty.');
      return;
    }

    // front-end safety checks
    for (let i = 0; i < movies.length; i++) {
      const it = movies[i];

      const type = String(it?.type || '').trim();
      const name = String(it?.name || '').trim();
      const id = String(it?._id || '').trim();

      if (!name) throw new Error(`Row ${i + 1}: missing "name"`);
      if (!['Movie', 'WebSeries'].includes(type))
        throw new Error(`Row ${i + 1}: invalid "type" (Movie/WebSeries only)`);

      if (requireId && !id) {
        throw new Error(
          `Row ${i + 1}: missing "_id". Disable "Require _id" if you REALLY want to update by (name+type).`
        );
      }
    }

    try {
      setUpdating(true);
      setUpdateResult(null);

      const res = await bulkExactUpdateMoviesAdmin(token, movies);

      setUpdateResult(res);

      toast.success(
        `Update done. Matched: ${res?.matched || 0}, Modified: ${
          res?.modified || 0
        }, Errors: ${res?.errorsCount || 0}`
      );
    } catch (e) {
      toast.error(e?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const foundMovies = Array.isArray(lookupResult?.movies) ? lookupResult.movies : [];
  const notFound = Array.isArray(lookupResult?.notFound) ? lookupResult.notFound : [];

  return (
    <SideBarShell>
      <div className="text-white flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold">Update Movies</h2>
          <p className="text-sm text-dryGray mt-1">
            1) Paste names → 2) Fetch documents → 3) Edit JSON → 4) Update MongoDB via{' '}
            <code className="text-white">PUT /api/movies/bulk-exact</code>
          </p>
          <p className="text-xs text-dryGray mt-2">
            Tip: Don&apos;t change <code className="text-white">rate</code> /
            <code className="text-white"> numberOfReviews</code> here (those are auto-managed).
          </p>
        </div>

        {/* Input */}
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste names (one per line) OR JSON array..."
          className="w-full min-h-[220px] bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple"
        />

        {/* Options */}
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

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={requireId}
            onChange={(e) => setRequireId(e.target.checked)}
            className="accent-customPurple"
          />
          <span className="text-sm text-white">
            Require <code className="text-white">_id</code> for updates (safer)
          </span>
        </label>

        {/* Buttons */}
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
            {finding ? 'Searching...' : 'Get Movies'}
          </button>
        </div>

        {/* Lookup results */}
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
                  {notFound.slice(0, 200).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {foundMovies.length ? (
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
                    </tr>
                  </thead>
                  <tbody className="bg-dry">
                    {foundMovies.map((m) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-border text-sm">No documents matched your input.</p>
            )}
          </div>
        ) : null}

        {/* Editor */}
        {foundMovies.length ? (
          <div className="bg-dry border border-border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">Editable Update JSON</h3>

              <button
                type="button"
                onClick={() => formatEditor()}
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
                {updating ? 'Updating...' : 'Update Movies'}
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
              <code className="text-white">PUT /api/movies/bulk-exact</code>
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
      </div>
    </SideBarShell>
  );
}
