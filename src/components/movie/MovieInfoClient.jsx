// src/components/movie/MovieInfoClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaFolder,
  FaRegClock,
  FaPlay,
  FaShareAlt,
  FaCloudDownloadAlt,
} from 'react-icons/fa';
import { SiImdb, SiRottentomatoes } from 'react-icons/si';

import MovieAverageStars from './MovieAverageStars';
import SafeImage from '../common/SafeImage';

const MOBILE_DESC_WORDS = 50;
const DESKTOP_DESC_WORDS = 100;

const splitWords = (text = '') =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const truncateByWords = (text, maxWords) => {
  const words = splitWords(text);
  if (!words.length) return { text: '', isTruncated: false };
  if (words.length <= maxWords)
    return { text: words.join(' '), isTruncated: false };
  return { text: `${words.slice(0, maxWords).join(' ')}…`, isTruncated: true };
};

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

const personSlug = (name = '') =>
  String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function ExternalRatings({ movie }) {
  const imdb = movie?.externalRatings?.imdb || {};
  const rt = movie?.externalRatings?.rottenTomatoes || {};

  const imdbRating = toNumberOrNull(imdb.rating);
  const imdbVotes = toNumberOrNull(imdb.votes);

  const imdbUrl =
    String(imdb.url || '').trim() ||
    (movie?.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : '') ||
    (movie?.name
      ? `https://www.imdb.com/find?q=${encodeURIComponent(movie.name)}`
      : '');

  const rtRating = toNumberOrNull(rt.rating);
  const rtUrl =
    String(rt.url || '').trim() ||
    (movie?.name
      ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
          movie.name
        )}`
      : '');

  const showImdb = !!imdbUrl;
  const showRt = !!rtUrl;

  if (!showImdb && !showRt) return null;

  const hasImdb = imdbRating !== null;
  const hasRt = rtRating !== null;

  const badgeBase =
    'inline-flex items-center gap-2 px-3 py-2 rounded bg-main border border-border text-sm text-white hover:border-customPurple transitions';

  const badgeMuted = 'opacity-80';

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {showImdb ? (
        <a
          href={imdbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${badgeBase} ${hasImdb ? '' : badgeMuted}`}
          title={hasImdb ? 'IMDb rating' : 'Open IMDb'}
        >
          <SiImdb className="text-[#f5c518]" />
          <span className="font-semibold">IMDb</span>

          <span className="text-dryGray">
            {hasImdb ? `${imdbRating.toFixed(1)}/10` : 'View on IMDb'}
            {hasImdb && imdbVotes !== null
              ? ` (${imdbVotes.toLocaleString()} votes)`
              : ''}
          </span>
        </a>
      ) : null}

      {showRt ? (
        <a
          href={rtUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${badgeBase} ${hasRt ? '' : badgeMuted}`}
          title={hasRt ? 'Rotten Tomatoes score' : 'Search Rotten Tomatoes'}
        >
          <SiRottentomatoes className="text-[#fa320a]" />
          <span className="font-semibold">Rotten</span>

          <span className="text-dryGray">
            {hasRt ? `${rtRating}%` : 'Search on RT'}
          </span>
        </a>
      ) : null}
    </div>
  );
}


function CastScroller({ casts = [] }) {
  const list = Array.isArray(casts)
    ? casts.filter((c) => c?.name).slice(0, 20)
    : [];

  if (!list.length) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">Cast</h3>
        <span className="text-xs text-dryGray">{list.length} shown</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {list.map((c, idx) => {
          const slug = c?.slug || personSlug(c?.name);
          const href = `/actor/${slug}`;

          return (
            <Link
  key={`${slug}-${idx}`}
  href={href}
  className="min-w-[120px] max-w-[160px] bg-main border border-border rounded-lg p-2 hover:border-customPurple transitions"
>
  <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-black/40 border border-border flex items-center justify-center">
    <SafeImage
      src={c?.image || '/images/placeholder.jpg'}
      alt={c?.name || 'Actor'}
      width={100}
      height={120}
      className="object-contain"
    />
  </div>

  <p className="mt-1 text-[11px] font-medium text-white/90 text-center line-clamp-2 leading-tight">
    {c?.name}
  </p>
</Link>

          );
        })}
      </div>
    </section>
  );
}

export default function MovieInfoClient({ movie, onShare }) {
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => setDescExpanded(false), [movie?._id]);

  const watchSeg = movie?.slug || movie?._id;

  const mobileDesc = useMemo(
    () => truncateByWords(movie?.desc || '', MOBILE_DESC_WORDS),
    [movie?.desc]
  );

  const desktopDesc = useMemo(
    () => truncateByWords(movie?.desc || '', DESKTOP_DESC_WORDS),
    [movie?.desc]
  );

  const categoryHref = movie?.category
    ? `/movies?category=${encodeURIComponent(movie.category)}`
    : '/movies';

  const directorName = String(movie?.director || '').trim();
  const directorHref = directorName ? `/actor/${personSlug(directorName)}` : '';

  /* =========================
     MOBILE (unchanged)
     ========================= */
  return (
    <div className="w-full text-white">
      {/* MOBILE HERO: titleImage 60vh + title/meta + watch button */}
      <section className="sm:hidden px-4 mt-4">
        <div className="relative w-full h-[60vh] rounded-xl overflow-hidden border border-border bg-main">
          <SafeImage
            src={movie?.titleImage || movie?.image || '/images/placeholder.jpg'}
            alt={movie?.name || 'Movie'}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-3 bg-dry border border-border rounded-xl p-4">
          <h1 className="text-lg font-bold leading-snug">{movie?.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-dryGray">
            {movie?.time ? (
              <span className="inline-flex items-center gap-1">
                <FaRegClock className="text-subMain w-3 h-3" />
                {formatTime(movie.time)}
              </span>
            ) : null}

            {movie?.category ? (
              <Link
                href={categoryHref}
                className="inline-flex items-center gap-1 hover:text-customPurple transitions"
              >
                <FaFolder className="text-subMain w-3 h-3" />
                {movie.category}
              </Link>
            ) : null}

            {movie?.language ? (
              <span className="inline-flex items-center gap-1">
                <span className="text-subMain">Lang:</span>
                {movie.language}
              </span>
            ) : null}
          </div>

          {directorName ? (
            <div className="mt-2 text-xs text-dryGray">
              Director:{' '}
              <Link
                href={directorHref}
                className="text-customPurple hover:underline"
              >
                {directorName}
              </Link>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Link
              href={`/watch/${watchSeg}`}
              className="flex-1 bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <FaPlay className="text-sm" />
              Watch
            </Link>

            <button
              type="button"
              onClick={() => onShare?.()}
              className="w-12 h-12 rounded-lg border border-border bg-main hover:border-customPurple transition flex items-center justify-center"
              aria-label="Share"
            >
              <FaShareAlt />
            </button>
          </div>
        </div>

        {/* BELOW TOP VIEWPORT: Description */}
        <div className="mt-4 bg-dry border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2">Description</h2>

          <p className="text-sm text-text leading-6 whitespace-pre-line">
            {descExpanded || !mobileDesc.isTruncated
              ? movie?.desc || ''
              : mobileDesc.text}
          </p>

          {mobileDesc.isTruncated ? (
            <button
              type="button"
              onClick={() => setDescExpanded((p) => !p)}
              className="mt-2 text-customPurple hover:text-white transitions font-semibold text-sm"
            >
              {descExpanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>

        {/* Rating section */}
        <div className="mt-4 bg-dry border border-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-white font-semibold text-sm">Rating</p>
            <p className="text-xs text-dryGray">
              {Number(movie?.numberOfReviews || 0).toLocaleString()} reviews
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <MovieAverageStars
              movieIdOrSlug={movie?.slug || movie?._id}
              fallback={movie?.rate || 0}
            />
            <span className="text-sm text-dryGray">
              {Number(movie?.rate || 0).toFixed(1)}/5
            </span>
          </div>

          <ExternalRatings movie={movie} />
        </div>

        {/* Cast */}
        <CastScroller casts={movie?.casts} />
      </section>

      {/* =========================
         DESKTOP/TABLET (sm+): background image + poster left + content right
         Order:
         info row -> description -> watch/share -> rating -> cast
         ========================= */}
      <section className="hidden sm:block">
        <div className="relative w-full min-h-[720px] lg:min-h-[calc(100vh-120px)] overflow-hidden rounded border border-border bg-black">
          {/* Background image visible on ALL sm+ */}
          <SafeImage
            src={movie?.image || movie?.titleImage || '/images/placeholder.jpg'}
            alt={movie?.name || 'Movie background'}
            fill
            sizes="100vw"
            className="object-cover"
          />

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-main/95" />

          <div className="relative container mx-auto px-8 py-10 lg:py-14">
            <div className="grid grid-cols-3 gap-8 items-start">
              {/* Poster / Title image */}
              <div className="col-span-1">
                <div className="w-full rounded-md overflow-hidden border border-border bg-dry">
                  <SafeImage
                    src={
                      movie?.titleImage ||
                      movie?.image ||
                      '/images/placeholder.jpg'
                    }
                    alt={movie?.name || 'Movie'}
                    width={520}
                    height={780}
                    className="object-cover w-full h-auto"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="col-span-2">
                <h1 className="text-3xl lg:text-4xl  font-bold leading-tight">
                  {movie?.name}
                </h1>

                {/* Info line: duration, category, language, director */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-dryGray text-sm">
                  {movie?.time ? (
                    <span className="inline-flex items-center gap-1">
                      <FaRegClock className="text-subMain w-3 h-3" />
                      {formatTime(movie.time)}
                    </span>
                  ) : null}

                  {movie?.category ? (
                    <Link
                      href={categoryHref}
                      className="inline-flex items-center gap-1 hover:text-customPurple transitions"
                    >
                      <FaFolder className="text-subMain w-3 h-3" />
                      {movie.category}
                    </Link>
                  ) : null}

                  {movie?.language ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-subMain">Lang:</span>
                      {movie.language}
                    </span>
                  ) : null}

                  {directorName ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-subMain">Director:</span>
                      <Link
                        href={directorHref}
                        className="text-customPurple hover:underline"
                      >
                        {directorName}
                      </Link>
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <div className="mt-5 text-text text-sm leading-7">
                  <p className="whitespace-pre-line">
                    {descExpanded || !desktopDesc.isTruncated
                      ? movie?.desc || ''
                      : desktopDesc.text}
                  </p>

                  {desktopDesc.isTruncated ? (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((p) => !p)}
                      className="mt-2 text-customPurple hover:text-white transitions font-semibold text-sm"
                    >
                      {descExpanded ? 'Show less' : 'Read more'}
                    </button>
                  ) : null}
                </div>

                {/* Watch + Share + (Desktop Download if exists) */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/watch/${watchSeg}`}
                    className="bg-customPurple hover:bg-opacity-90 transition text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <FaPlay className="text-sm" />
                    Watch
                  </Link>

                  <button
                    type="button"
                    onClick={() => onShare?.()}
                    className="px-6 py-3 rounded-lg border border-border bg-black/30 hover:border-customPurple transition flex items-center gap-2"
                    aria-label="Share"
                  >
                    <FaShareAlt />
                    Share
                  </button>

                  {movie?.type === 'Movie' && movie?.downloadUrl ? (
                    <a
                      href={movie.downloadUrl}
                      className="px-6 py-3 rounded-lg border border-customPurple bg-black/30 hover:bg-customPurple hover:text-white transition flex items-center gap-2"
                    >
                      <FaCloudDownloadAlt />
                      Download
                    </a>
                  ) : null}
                </div>

                {/* Rating */}
                <div className="mt-6 bg-black/30 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-white font-semibold text-sm">Rating</p>
                    <p className="text-xs text-dryGray">
                      {Number(movie?.numberOfReviews || 0).toLocaleString()}{' '}
                      reviews
                    </p>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <MovieAverageStars
                      movieIdOrSlug={movie?.slug || movie?._id}
                      fallback={movie?.rate || 0}
                    />
                    <span className="text-sm text-dryGray">
                      {Number(movie?.rate || 0).toFixed(1)}/5
                    </span>
                  </div>

                  <ExternalRatings movie={movie} />
                </div>

                {/* Cast */}
                <CastScroller casts={movie?.casts} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
