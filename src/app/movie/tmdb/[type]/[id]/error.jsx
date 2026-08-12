'use client';

export default function TmdbMovieError({ reset }) {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-3xl font-bold">Title temporarily unavailable</h1>
      <p className="mt-3 text-text">
        We could not load this title right now. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded bg-customPurple px-5 py-3 font-semibold"
      >
        Try again
      </button>
    </div>
  );
}