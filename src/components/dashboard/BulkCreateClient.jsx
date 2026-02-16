'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';

import { bulkCreateMoviesAdmin } from '../../lib/client/moviesAdmin';

const SAMPLE_PAYLOAD = `{
  "movies": [
    {
      "type": "Movie",
      "name": "Example Movie",
      "desc": "Short description...",
      "image": "https://cdn.moviefrost.com/uploads/example-poster.jpg",
      "titleImage": "https://cdn.moviefrost.com/uploads/example-title.jpg",
      "category": "Action",
      "browseBy": "Hollywood (English)",
      "thumbnailInfo": "HD",
      "language": "English",
      "year": 2024,
      "time": 120,
      "video": "https://server1.example.com/stream.m3u8",
      "videoUrl2": "https://server2.example.com/stream.m3u8",
      "videoUrl3": "https://server3.example.com/stream.m3u8",
      "videoUrl7": "https://server-all-in-one.example.com/embed",
      "downloadUrl": "",
      "latest": false,
      "previousHit": false,
      "isPublished": false
    }
  ]
}`;

const parseMoviesFromText = (text) => {
  if (!text || !text.trim()) throw new Error('Paste your JSON first.');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON. Please fix the JSON and try again.');
  }

  const movies = Array.isArray(parsed) ? parsed : parsed?.movies;

  if (!Array.isArray(movies)) {
    throw new Error('JSON must be either an array OR { "movies": [ ... ] }');
  }
  if (!movies.length) throw new Error('Movies array is empty.');

  return movies;
};

const chunkArray = (arr, size) => {
  if (!size || size <= 0) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function BulkCreateClient() {
  return (
    <RequireAdmin>{(user) => <BulkCreateInner token={user.token} />}</RequireAdmin>
  );
}

function BulkCreateInner({ token }) {
  const [raw, setRaw] = useState('');
  const [chunkSize, setChunkSize] = useState(50);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const handleUseSample = () => {
    setRaw(SAMPLE_PAYLOAD);
    setResult(null);
  };

  const handleFormat = () => {
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      setRaw(JSON.stringify(parsed, null, 2));
      toast.success('Formatted JSON');
    } catch {
      toast.error('Cannot format: invalid JSON');
    }
  };

  const handleValidate = () => {
    try {
      const movies = parseMoviesFromText(raw);
      toast.success(`Valid JSON. Movies: ${movies.length}`);
    } catch (e) {
      toast.error(e.message || 'Invalid JSON');
    }
  };

  const handleUpload = async () => {
    let movies;
    try {
      movies = parseMoviesFromText(raw);
    } catch (e) {
      toast.error(e.message || 'Invalid JSON');
      return;
    }

    const size = Math.max(0, Number(chunkSize) || 0);
    const chunks = chunkArray(movies, size ? Math.floor(size) : 0);

    let insertedTotal = 0;
    let allErrors = [];
    let globalOffset = 0;

    setUploading(true);
    setResult(null);
    setProgress({ current: 0, total: chunks.length });

    try {
      for (let i = 0; i < chunks.length; i++) {
        setProgress({ current: i + 1, total: chunks.length });

        const chunk = chunks[i];
        const data = await bulkCreateMoviesAdmin(token, chunk);

        const insertedCount = Number(data?.insertedCount || data?.inserted?.length || 0);
        insertedTotal += insertedCount;

        const chunkErrors = Array.isArray(data?.errors) ? data.errors : [];
        if (chunkErrors.length) {
          allErrors = allErrors.concat(
            chunkErrors.map((err) => ({
              ...err,
              chunk: i + 1,
              globalIndex: typeof err?.index === 'number' ? globalOffset + err.index : undefined,
            }))
          );
        }

        globalOffset += chunk.length;
      }

      setResult({
        submitted: movies.length,
        inserted: insertedTotal,
        errors: allErrors,
      });

      toast.success(`Bulk complete. Inserted: ${insertedTotal}. Errors: ${allErrors.length}`);
    } catch (e) {
      toast.error(e?.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <SideBarShell>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold">Bulk Create</h2>
          <p className="text-sm text-dryGray mt-1">
            Paste JSON for <code className="text-white">POST /api/movies/bulk</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-border">Chunk size (0 = single request)</label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(e.target.value)}
              className="bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple w-56"
              min={0}
            />
          </div>

          <button onClick={handleUseSample} type="button" className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm">
            Use Sample
          </button>

          <button onClick={handleFormat} type="button" className="px-4 py-2 rounded border border-border bg-dry hover:bg-main transition text-sm">
            Format JSON
          </button>

          <button onClick={handleValidate} type="button" className="px-4 py-2 rounded border border-customPurple text-white hover:bg-customPurple transition text-sm">
            Validate
          </button>

          <button
            onClick={handleUpload}
            disabled={uploading}
            type="button"
            className="ml-auto px-6 py-2 rounded bg-customPurple hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste your JSON here..."
          className="w-full min-h-[60vh] bg-black border border-border rounded-lg p-4 text-xs font-mono text-white outline-none focus:border-customPurple"
        />

        {uploading && progress && (
          <div className="bg-dry border border-border rounded-lg p-4">
            <p className="text-sm text-white">
              Uploading chunk {progress.current} / {progress.total}...
            </p>
          </div>
        )}

        {result && (
          <div className="bg-dry border border-border rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <p>Submitted: <span className="text-customPurple font-semibold">{result.submitted}</span></p>
              <p>Inserted: <span className="text-green-500 font-semibold">{result.inserted}</span></p>
              <p>Errors: <span className="text-red-500 font-semibold">{result.errors?.length || 0}</span></p>
            </div>

            {result.errors?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border">
                  <thead className="bg-main text-white">
                    <tr>
                      <th className="text-left p-2 border-b border-border">#</th>
                      <th className="text-left p-2 border-b border-border">Chunk</th>
                      <th className="text-left p-2 border-b border-border">Index</th>
                      <th className="text-left p-2 border-b border-border">Name</th>
                      <th className="text-left p-2 border-b border-border">Type</th>
                      <th className="text-left p-2 border-b border-border">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-dry">
                    {result.errors.slice(0, 200).map((e, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{e.chunk || '-'}</td>
                        <td className="p-2">{e.globalIndex ?? e.index ?? '-'}</td>
                        <td className="p-2">{e.name || '-'}</td>
                        <td className="p-2">{e.type || '-'}</td>
                        <td className="p-2 text-red-400">{e.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {result.errors.length > 200 && (
                  <p className="text-xs text-dryGray mt-2">
                    Showing first 200 errors.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SideBarShell>
  );
}
