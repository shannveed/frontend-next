// src/components/common/Uploader.jsx
'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { compressImageFile, formatBytes } from '../../lib/client/imageCompression';

export default function Uploader({
  setImageUrl,
  compression = null,
  accept = 'image/*',
  maxOriginalMB = 15,
  buttonText = 'Upload',
}) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | compressing | uploading
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);

  const busy = status !== 'idle';

  const maxBytes = useMemo(
    () => Math.max(1, Number(maxOriginalMB) * 1024 * 1024),
    [maxOriginalMB]
  );

  const handleSelect = (f) => {
    setError('');
    setInfo(null);

    if (!f) {
      setFile(null);
      return;
    }

    if (f.size > maxBytes) {
      setFile(null);
      setError(`File too large (${formatBytes(f.size)}). Max is ${maxOriginalMB}MB.`);
      return;
    }

    setFile(f);
  };

  const handleUpload = async () => {
    setError('');

    if (!file) {
      setError('Please select a file first.');
      return;
    }

    try {
      setStatus('compressing');

      let fileToUpload = file;
      let compressionInfo = null;

      if (compression && String(file.type || '').startsWith('image/')) {
        const res = await compressImageFile(file, compression);
        fileToUpload = res.file;
        compressionInfo = res;
        setInfo(res);
      }

      setStatus('uploading');

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Upload failed');
      }

      if (data?.success && data?.url) {
        setImageUrl?.(data.url);
        setFile(null);

        if (!compressionInfo) {
          setInfo({
            originalBytes: file.size,
            compressedBytes: file.size,
            skipped: true,
          });
        }

        toast.success('Image uploaded');
        return;
      }

      throw new Error(data?.message || 'Upload failed');
    } catch (e) {
      setError(e?.message || 'Failed to upload image.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-red-500 text-xs">{error}</p> : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="file"
          accept={accept}
          onChange={(e) => handleSelect(e.target.files?.[0] || null)}
          className="flex-1 bg-dry border border-border rounded px-3 py-2 text-sm text-white"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={busy}
          className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
        >
          {status === 'compressing'
            ? 'Compressing...'
            : status === 'uploading'
            ? 'Uploading...'
            : buttonText}
        </button>
      </div>

      {info?.originalBytes ? (
        <div className="text-xs text-dryGray">
          <div>
            Original:{' '}
            <span className="text-white">{formatBytes(info.originalBytes)}</span>
            {' → '}
            Uploaded:{' '}
            <span className="text-white">{formatBytes(info.compressedBytes)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
