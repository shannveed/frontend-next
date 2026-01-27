'use client';

import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

export default function StarRatingInput({
  value = 0,
  onChange,
  disabled = false,
  size = 18,
  className = '',
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className={`flex items-center gap-1 ${className}`} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(v)}
          onMouseEnter={() => setHover(v)}
          className="p-0.5"
          aria-label={`${v} star`}
        >
          <FaStar size={size} className={display >= v ? 'text-star' : 'text-border'} />
        </button>
      ))}
    </div>
  );
}
