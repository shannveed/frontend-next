// frontend-next/src/components/movies/SeoLandingHero.jsx
import React from 'react';

export default function SeoLandingHero({
  eyebrow = 'MovieFrost Collection',
  title,
  description,
  chips = [],
  contained = true,
  className = '',
}) {
  const content = (
    <div className="bg-dry border border-border rounded-lg p-5 sm:p-6">
      <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
        {eyebrow}
      </p>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
        {title}
      </h1>

      {description ? (
        <p className="text-text text-sm sm:text-base leading-7 mt-3 max-w-4xl">
          {description}
        </p>
      ) : null}

      {chips?.length ? (
        <div className="flex flex-wrap gap-2 mt-4">
          {chips.map((chip, idx) => (
            <span
              key={`${chip}-${idx}`}
              className="px-3 py-1 rounded bg-main border border-border text-xs text-white"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!contained) {
    return <div className={className}>{content}</div>;
  }

  return <div className={`container pt-6 ${className}`}>{content}</div>;
}
