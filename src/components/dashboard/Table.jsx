// src/components/dashboard/Table.jsx
'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { FaCloudDownloadAlt, FaEdit } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import { GoEye } from 'react-icons/go';
import SafeImage from '../common/SafeImage';

const formatTime = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);
  let out = '';
  if (hrs > 0) out += `${hrs}Hr `;
  if (mins > 0) out += `${mins}Min`;
  return out.trim();
};

const Head =
  'text-xs above-1000:text-[11px] mobile:text-[10px] text-left text-main font-semibold px-6 above-1000:px-4 mobile:px-2 py-2 mobile:py-1 uppercase';
const Text =
  'text-sm above-1000:text-xs mobile:text-[11px] text-left leading-6 above-1000:leading-5 mobile:leading-4 break-words px-5 above-1000:px-3 mobile:px-2 py-3 above-1000:py-2 mobile:py-1.5';

const MobileCard = memo(function MobileCard({
  movie,
  admin = false,
  downloadVideo,
  onDeleteHandler,
  progress = 0,
}) {
  const movieHref = `/movie/${movie?.slug || movie?._id}`;
  const editHref = `/edit/${movie?.slug || movie?._id}`; // ✅ slug-first

  return (
    <article className="bg-dry border border-border rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-main">
          <SafeImage
            src={movie?.titleImage ?? '/images/placeholder.jpg'}
            alt={`${movie?.name || 'Movie'} poster`}
            width={80}
            height={80}
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1 line-clamp-2">
            {movie?.name}
          </h3>
          <p className="text-xs text-text mb-1 truncate">{movie?.category}</p>
          <p className="text-xs text-text">
            {movie?.year} {movie?.time ? `• ${formatTime(movie.time)}` : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {admin ? (
          <>
            <a
              href={editHref}
              className="flex-1 border border-border bg-dry flex gap-1 items-center justify-center text-xs rounded py-2"
            >
              Edit <FaEdit className="text-green-500 text-sm" />
            </a>

            <button
              onClick={() => onDeleteHandler?.(movie?._id)}
              className="bg-customPurple text-white rounded px-4 py-2 flex items-center justify-center"
              type="button"
            >
              <MdDelete className="text-sm" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => downloadVideo?.(movie?.downloadUrl, movie?.name)}
              disabled={progress > 0 && progress < 100}
              className="flex-1 border border-border bg-dry flex gap-1 items-center justify-center text-xs rounded py-2"
              type="button"
            >
              Download <FaCloudDownloadAlt className="text-green-500 text-sm" />
            </button>

            <Link
              href={movieHref}
              className="bg-customPurple text-white rounded px-4 py-2 flex items-center justify-center"
            >
              <GoEye className="text-sm" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
});

const Row = memo(function Row({
  movie,
  admin = false,
  onDeleteHandler,
  downloadVideo,
  progress = 0,
}) {
  const movieHref = `/movie/${movie?.slug || movie?._id}`;
  const editHref = `/edit/${movie?.slug || movie?._id}`; // ✅ slug-first

  return (
    <tr>
      <td className={Text}>
        <div className="w-12 p-1 bg-dry border border-border h-12 rounded overflow-hidden">
          <SafeImage
            src={movie?.titleImage ?? '/images/placeholder.jpg'}
            alt={`${movie?.name || 'Movie'} poster`}
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
      </td>

      <td className={`${Text} max-w-[220px]`}>
        <span className="line-clamp-2">{movie?.name}</span>
      </td>

      <td className={`${Text} mobile:hidden`}>{movie?.category || '-'}</td>
      <td className={`${Text} mobile:hidden`}>{movie?.browseBy || '-'}</td>
      <td className={`${Text} mobile:hidden`}>{movie?.language || '-'}</td>
      <td className={Text}>{movie?.year || '-'}</td>
      <td className={`${Text} mobile:hidden`}>
        {movie?.time ? formatTime(movie.time) : '-'}
      </td>

      <td className={`${Text} flex gap-2 justify-end`}>
        {admin ? (
          <>
            <a
              href={editHref}
              className="border border-border bg-dry flex gap-2 items-center text-border rounded py-1 px-2 mobile:hidden"
            >
              Edit <FaEdit className="text-green-500" />
            </a>

            <button
              onClick={() => onDeleteHandler?.(movie?._id)}
              className="bg-customPurple text-white rounded w-6 h-6 flex items-center justify-center"
              type="button"
            >
              <MdDelete />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => downloadVideo?.(movie?.downloadUrl, movie?.name)}
              disabled={progress > 0 && progress < 100}
              className="border border-border bg-dry flex gap-2 items-center text-white/60 rounded py-1 px-2 mobile:hidden"
              type="button"
            >
              Download <FaCloudDownloadAlt className="text-green-500" />
            </button>

            <Link
              href={movieHref}
              className="bg-customPurple text-white rounded w-6 h-6 flex items-center justify-center"
            >
              <GoEye />
            </Link>
          </>
        )}
      </td>
    </tr>
  );
});

export default memo(function Table({
  data = [],
  admin = false,
  onDeleteHandler,
  downloadVideo,
  progress = 0,
}) {
  return (
    <>
      <div className="sm:hidden" role="list" aria-label="Movies list">
        {data.map((movie) => (
          <MobileCard
            key={movie._id}
            movie={movie}
            admin={admin}
            downloadVideo={downloadVideo}
            onDeleteHandler={onDeleteHandler}
            progress={progress}
          />
        ))}
      </div>

      <div className="hidden sm:block relative w-full overflow-hidden">
        <table className="w-full table-auto border border-border divide-y divide-border">
          <thead>
            <tr className="bg-dryGray">
              <th className={Head}>Image</th>
              <th className={Head}>Name</th>
              <th className={`${Head} mobile:hidden`}>Category</th>
              <th className={`${Head} mobile:hidden`}>Browse By</th>
              <th className={`${Head} mobile:hidden`}>Language</th>
              <th className={Head}>Year</th>
              <th className={`${Head} mobile:hidden`}>Duration</th>
              <th className={`${Head} text-right pr-8`}>Actions</th>
            </tr>
          </thead>

          <tbody className="bg-main divide-y divide-gray-800">
            {data.map((movie) => (
              <Row
                key={movie._id}
                movie={movie}
                admin={admin}
                onDeleteHandler={onDeleteHandler}
                downloadVideo={downloadVideo}
                progress={progress}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
});
