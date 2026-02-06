'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

const ALLOWED_HOSTNAMES = new Set([
  'cdn.moviefrost.com',
  'www.moviefrost.com',
  'moviefrost.com',
  'moviefrost-backend.vercel.app',
  'image.tmdb.org',
  'fra.cloud.appwrite.io',
  'cloud.appwrite.io',
]);

const normalizeSrc = (src, fallback) => {
  const s = typeof src === 'string' ? src.trim() : '';
  if (!s) return fallback;

  // local image
  if (s.startsWith('/')) return s;

  // remote image
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (!ALLOWED_HOSTNAMES.has(u.hostname)) return fallback;
      return s;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export default function SafeImage({
  src,
  alt = '',
  fallbackSrc = '/images/placeholder.jpg',
  onError,
  ...props
}) {
  const safeSrc = useMemo(() => normalizeSrc(src, fallbackSrc), [src, fallbackSrc]);

  const [useFallback, setUseFallback] = useState(false);

  // reset when src changes
  useEffect(() => {
    setUseFallback(false);
  }, [safeSrc]);

  const finalSrc = useFallback ? fallbackSrc : safeSrc;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      onError={(e) => {
        // If remote fails (404 etc.), switch to placeholder
        if (!useFallback && safeSrc !== fallbackSrc) {
          setUseFallback(true);
        }
        onError?.(e);
      }}
      {...props}
    />
  );
}
