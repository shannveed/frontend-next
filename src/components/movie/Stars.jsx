// src/components/movie/Stars.jsx
import React from 'react';
import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';

export default function Stars({ value = 0, className = '' }) {
  const v = Number(value) || 0;

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label={`Rating ${v}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const full = v >= n;
        const half = !full && v >= n - 0.5;

        if (full) return <FaStar key={n} className="text-star" />;
        if (half) return <FaStarHalfAlt key={n} className="text-star" />;
        return <FaRegStar key={n} className="text-border" />;
      })}
    </div>
  );
}
