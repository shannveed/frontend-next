'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import SafeImage from '../common/SafeImage';

const hintedOrigins = new Set();

const safeTrim = (value) => String(value ?? '').trim();

const addResourceHint = (rel, href) => {
  if (typeof document === 'undefined' || !href) return;

  const key = `${rel}:${href}`;
  if (hintedOrigins.has(key)) return;

  hintedOrigins.add(key);

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;

  if (rel === 'preconnect') {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
};

const warmTrailerConnections = (provider) => {
  if (provider === 'youtube') {
    addResourceHint('dns-prefetch', 'https://www.youtube-nocookie.com');
    addResourceHint('dns-prefetch', 'https://www.youtube.com');
    addResourceHint('dns-prefetch', 'https://i.ytimg.com');

    addResourceHint('preconnect', 'https://www.youtube-nocookie.com');
    addResourceHint('preconnect', 'https://www.youtube.com');
    addResourceHint('preconnect', 'https://i.ytimg.com');
    return;
  }

  if (provider === 'vimeo') {
    addResourceHint('dns-prefetch', 'https://player.vimeo.com');
    addResourceHint('preconnect', 'https://player.vimeo.com');
  }
};

const isDirectVideoFile = (rawUrl) => {
  const url = safeTrim(rawUrl);
  if (!url) return false;

  try {
    const u = new URL(url);
    return /\.(mp4|webm|ogg|m3u8)(?:$|\?)/i.test(u.pathname);
  } catch {
    return /\.(mp4|webm|ogg|m3u8)(?:$|\?)/i.test(url);
  }
};

const getYoutubeId = (rawUrl) => {
  const url = safeTrim(rawUrl);
  if (!url) return '';

  try {
    const u = new URL(url);
    const host = String(u.hostname || '').toLowerCase();

    if (host.includes('youtu.be')) {
      return safeTrim(u.pathname.split('/').filter(Boolean)[0]);
    }

    if (
      host.includes('youtube.com') ||
      host.includes('m.youtube.com') ||
      host.includes('youtube-nocookie.com')
    ) {
      const v = safeTrim(u.searchParams.get('v'));
      if (v) return v;

      const parts = u.pathname.split('/').filter(Boolean);

      const embedIndex = parts.indexOf('embed');
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return safeTrim(parts[embedIndex + 1]);
      }

      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex !== -1 && parts[shortsIndex + 1]) {
        return safeTrim(parts[shortsIndex + 1]);
      }
    }
  } catch {
    // ignore
  }

  return '';
};

const getVimeoId = (rawUrl) => {
  const url = safeTrim(rawUrl);
  if (!url) return '';

  try {
    const u = new URL(url);
    const host = String(u.hostname || '').toLowerCase();

    if (host.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const last = safeTrim(parts[parts.length - 1]);
      if (/^\d+$/.test(last)) return last;
    }
  } catch {
    // ignore
  }

  return '';
};

const buildTrailerInfo = (rawUrl) => {
  const url = safeTrim(rawUrl);

  if (!url) {
    return { provider: 'none', playUrl: '' };
  }

  if (isDirectVideoFile(url)) {
    return {
      provider: 'direct',
      playUrl: url,
    };
  }

  const youtubeId = getYoutubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      playUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      playUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`,
    };
  }

  return {
    provider: 'iframe',
    playUrl: url,
  };
};

export default function LiteTrailerPlayer({
  trailerUrl = '',
  movieName = 'Movie',
  posterCandidates = [],
}) {
  const info = useMemo(() => buildTrailerInfo(trailerUrl), [trailerUrl]);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    setActivated(false);
  }, [trailerUrl, movieName]);

  const warmUp = useCallback(() => {
    warmTrailerConnections(info.provider);
  }, [info.provider]);

  const activate = useCallback(() => {
    warmUp();
    setActivated(true);
  }, [warmUp]);

  if (!info.playUrl) return null;

  const posters = Array.isArray(posterCandidates)
    ? posterCandidates.filter(Boolean)
    : [];

  const poster = posters[0] || '/images/MOVIEFROST.png';

  if (activated) {
    if (info.provider === 'direct') {
      return (
        <video
          src={info.playUrl}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="w-full h-full"
        />
      );
    }

    return (
      <iframe
        src={info.playUrl}
        title={`${movieName} trailer`}
        className="w-full h-full"
        frameBorder="0"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={activate}
      onMouseEnter={warmUp}
      onFocus={warmUp}
      onTouchStart={warmUp}
      aria-label={`Play trailer for ${movieName}`}
      className="relative block w-full h-full overflow-hidden group"
    >
      <SafeImage
        src={poster}
        fallbackCandidates={posters.slice(1)}
        alt={`${movieName} trailer poster`}
        fill
        sizes="(max-width: 768px) 100vw, 1200px"
        className="object-cover transition duration-300 group-hover:scale-[1.02]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-customPurple text-white flex items-center justify-center shadow-lg border border-white/15 transition duration-300 group-hover:scale-105">
          <FaPlay className="ml-1 text-xl sm:text-2xl" />
        </span>

        <div className="text-center">
          <p className="text-white font-semibold text-sm sm:text-base">
            Play Trailer
          </p>

        </div>
      </div>
    </button>
  );
}
