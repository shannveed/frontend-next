// src/components/movie/MovieInfoClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaCalendarAlt,
  FaFolder,
  FaRegClock,
  FaPlay,
  FaShareAlt,
} from 'react-icons/fa';
import { FiLogIn } from 'react-icons/fi';
import { BiArrowBack } from 'react-icons/bi';

// ✅ NEW: live average stars
import MovieAverageStars from './MovieAverageStars';

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
  if (words.length <= maxWords) return { text: words.join(' '), isTruncated: false };
  return { text: `${words.slice(0, maxWords).join(' ')}…`, isTruncated: true };
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mql.matches);

    update();

    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
    };
  }, []);

  return isMobile;
};

const formatTime = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);

  let timeStr = '';
  if (hrs > 0) timeStr += `${hrs}Hr `;
  if (mins > 0) timeStr += `${mins}Min`;
  return timeStr.trim();
};

export default function MovieInfoClient({
  movie,
  onShare,
  onDownload,
  onBack,
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => setDescExpanded(false), [movie?._id]);

  const wordLimit = isMobile ? MOBILE_DESC_WORDS : DESKTOP_DESC_WORDS;

  const { text: collapsedDesc, isTruncated } = useMemo(() => {
    return truncateByWords(movie?.desc || '', wordLimit);
  }, [movie?.desc, wordLimit]);

  const descToShow =
    descExpanded || !isTruncated ? movie?.desc || '' : collapsedDesc;

  const watchPathSegment = movie?.slug || movie?._id;

  const canDownload = movie?.type === 'Movie' && !!movie?.downloadUrl;

  const doBack = () => {
    if (typeof onBack === 'function') return onBack();
    router.back();
  };

  const doDownload = () => {
    if (typeof onDownload === 'function') return onDownload(movie?.downloadUrl);
    if (!movie?.downloadUrl) return;

    const a = document.createElement('a');
    a.href = movie.downloadUrl;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const poster = movie?.image || '/images/placeholder.jpg';
  const titleImg = movie?.titleImage || poster;

  return (
    <div className="w-full xl:h-screen relative text-white" suppressHydrationWarning>
      {/* background image (desktop) */}
      <img
        src={poster}
        alt={movie?.name || 'Movie'}
        className="w-full hidden xl:inline-block h-full object-cover"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/images/placeholder.jpg';
        }}
      />

      <div className="xl:bg-main bg-dry flex-colo xl:bg-opacity-90 xl:absolute top-0 left-0 right-0 bottom-0">
        <div className="container px-8 mobile:px-4 mx-auto 2xl:px-32 xl:grid grid-cols-3 flex-colo py-10 lg:py-20 gap-8">
          {/* Back button (mobile/tablet like CRA) */}
          <div className="xl:hidden w-full">
            <button
              onClick={doBack}
              className="flex items-center gap-2 text-dryGray hover:text-white transitions mb-4"
              type="button"
            >
              <BiArrowBack className="text-xl" />
              <span>Back to Movies</span>
            </button>
          </div>

          {/* Title image */}
          <div className="xl:col-span-1 w-full xl:order-none order-last xl:h-header bg-dry border border-gray-800 rounded-lg overflow-hidden">
            <img
              src={titleImg}
              alt={movie?.name || 'Movie'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/placeholder.jpg';
              }}
            />
          </div>

          {/* Info */}
          <div className="mt-2 col-span-2 md:grid grid-cols-5 gap-4 items-center">
            <div className="col-span-3 flex flex-col gap-10 above-1000:gap-6">
              <h1 className="xl:text-4xl above-1000:text-3xl capitalize font-sans text-xl font-bold">
                {movie?.name}
              </h1>

              <div className="flex items-center gap-4 font-medium text-dryGray">
                <div className="flex-col bg-customPurple text-xs px-2 py-1">
                  HD 4K
                </div>

                <div className="flex items-center gap-1">
                  <FaRegClock className="text-subMain w-3 h-3" />
                  <p className="text-sm above-1000:text-xs">
                    {formatTime(movie?.time)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <FaCalendarAlt className="text-subMain w-3 h-3" />
                  <p className="text-sm above-1000:text-xs">{movie?.year}</p>
                </div>

                <div className="flex items-center gap-1">
                  <FaFolder className="text-subMain w-3 h-3" />
                  <p className="text-sm above-1000:text-xs">{movie?.category}</p>
                </div>
              </div>

              {/* Description with CRA word limits */}
              <div className="text-text text-sm above-1000:text-xs above-1000:leading-6 leading-7">
                <p className="whitespace-pre-line">{descToShow}</p>

                {isTruncated && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((p) => !p)}
                    className="mt-2 text-customPurple hover:text-white transitions font-semibold text-sm above-1000:text-xs"
                    aria-expanded={descExpanded}
                  >
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>

              {/* Share + language + watch */}
              <div className="grid sm:grid-cols-5 grid-cols-3 gap-4 p-6 above-1000:p-4 bg-main border border-gray-800 rounded-lg">
                <div className="col-span-1 flex-colo border-r border-border">
                  <button
                    onClick={() => onShare?.()}
                    className="w-10 h-10 above-1000:w-8 above-1000:h-8 hover:bg-customPurple flex-colo rounded-lg bg-white bg-opacity-20"
                    type="button"
                  >
                    <FaShareAlt className="above-1000:text-sm" />
                  </button>
                </div>

                <div className="col-span-2 flex-colo font-medium text-sm above-1000:text-xs">
                  <p>
                    Language :{' '}
                    <span className="ml-2 truncate">{movie?.language}</span>
                  </p>
                </div>

                <div className="sm:col-span-2 col-span-3 flex justify-end font-medium text-sm above-1000:text-xs">
                  <Link
                    href={`/watch/${watchPathSegment}`}
                    className="bg-dry py-4 above-1000:py-3 hover:bg-customPurple transitions border-2 border-customPurple rounded-full flex-rows gap-4 w-full sm:py-3"
                  >
                    <FaPlay className="w-3 h-3 above-1000:w-2.5 above-1000:h-2.5" />
                    Watch
                  </Link>
                </div>
              </div>

              {/* ✅ LIVE average stars (from /ratings aggregate) */}
              <div className="flex mb-6 above-1000:mb-4 text-lg above-1000:text-base gap-2">
                <MovieAverageStars
                  movieIdOrSlug={movie?.slug || movie?._id}
                  fallback={movie?.rate || 0}
                />
              </div>
            </div>

            {/* Download vertical button (CRA style) */}
            <div className="col-span-1 ml-4 md:mt-0 mt-2 flex justify-end">
              <button
                onClick={doDownload}
                disabled={!canDownload}
                className={`md:w-1/4 above-1000:w-1/3 w-full relative flex-colo border-2 transitions 
                  h-16 md:h-64 above-1000:h-48 sm:h-14 rounded font-medium
                  ${
                    canDownload
                      ? 'bg-customPurple hover:bg-transparent border-customPurple'
                      : 'bg-main border-border opacity-60 cursor-not-allowed'
                  }`}
                type="button"
              >
                <div className="flex-rows gap-6 above-1000:gap-4 text-md above-1000:text-sm uppercase tracking-widest absolute md:rotate-90">
                  Download <FiLogIn className="w-6 h-6 above-1000:w-5 above-1000:h-5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
