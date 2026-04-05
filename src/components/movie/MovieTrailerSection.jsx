// frontend-next/src/components/movie/MovieTrailerSection.jsx
import React from 'react';
import LiteTrailerPlayer from './LiteTrailerPlayer';

const safeTrim = (v) => String(v ?? '').trim();

export default function MovieTrailerSection({ movie }) {
  const trailerUrl = safeTrim(movie?.trailerUrl);

  // ✅ Only show if available
  if (!trailerUrl) return null;

  const posterCandidates = [
    safeTrim(movie?.image),
    safeTrim(movie?.titleImage),
    '/images/MOVIEFROST.png',
  ].filter(Boolean);

  return (
    <section className="my-16 bg-dry border border-border rounded-lg p-6 sm:p-8">
      <h2 className="text-white text-lg sm:text-xl font-semibold mb-4">
        Trailer
      </h2>

      <div
        className="w-full rounded-lg overflow-hidden border border-border bg-black"
        style={{ aspectRatio: '16 / 9' }}
      >
        <LiteTrailerPlayer
          trailerUrl={trailerUrl}
          movieName={movie?.name || 'Movie'}
          posterCandidates={posterCandidates}
        />
      </div>

      <p className="text-xs text-dryGray mt-2">
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-customPurple hover:underline"
        >
          Open trailer in new tab
        </a>
      </p>
    </section>
  );
}
