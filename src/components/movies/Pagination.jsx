'use client';

import React from 'react';
import { TbPlayerTrackNext, TbPlayerTrackPrev } from 'react-icons/tb';

export default function Pagination({ page = 1, pages = 1, onChange }) {
  const sameClass =
    'text-white py-2 px-4 rounded font-semibold border-2 border-customPurple hover:bg-customPurple transitions';

  const canPrev = page > 1;
  const canNext = page < pages;

  const computePages = () => {
    const max = Math.min(5, pages);
    const out = [];

    for (let i = 0; i < max; i++) {
      let p;
      if (pages <= 5) p = i + 1;
      else if (page <= 3) p = i + 1;
      else if (page >= pages - 2) p = pages - 4 + i;
      else p = page - 2 + i;

      out.push(p);
    }
    return out;
  };

  return (
    <div className="w-full flex-rows gap-3 my-10 mobile:px-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
        className={`${sameClass} px-2 py-2.5 text-sm ${!canPrev ? 'opacity-50 cursor-not-allowed' : ''}`}
        type="button"
      >
        <TbPlayerTrackPrev />
      </button>

      <div className="flex gap-1.5">
        {computePages().map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-2 text-sm rounded font-md transition-all ${
              page === p
                ? 'bg-customPurple text-white'
                : 'border-2 border-customPurple text-white hover:bg-customPurple'
            }`}
            type="button"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
        className={`${sameClass} px-2 py-2.5 text-sm ${!canNext ? 'opacity-50 cursor-not-allowed' : ''}`}
        type="button"
      >
        <TbPlayerTrackNext />
      </button>
    </div>
  );
}
