'use client';

import React from 'react';
import { FaRegClock, FaCalendarAlt, FaFolder } from 'react-icons/fa';

const formatTime = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}Hr`);
  if (mins > 0) parts.push(`${mins}Min`);
  return parts.join(' ');
};

export default function FlexMovieItems({ movie, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-4 items-center  text-dryGray ${className}`}>
      {movie?.time ? (
        <span className="flex items-center gap-1 text-sm">
          <FaRegClock className="text-subMain w-3 h-3" />
          <span>{formatTime(movie.time)}</span>
        </span>
      ) : null}

      {movie?.year ? (
        <span className="flex items-center gap-1 text-sm">
          <FaCalendarAlt className="text-subMain w-3 h-3" />
          <span>{movie.year}</span>
        </span>
      ) : null}

      {movie?.category ? (
        <span className="flex items-center gap-1 text-sm">
          <FaFolder className="text-subMain w-3 h-3" />
          <span className="truncate max-w-[220px]">{movie.category}</span>
        </span>
      ) : null}
    </div>
  );
}
