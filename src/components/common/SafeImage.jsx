// frontend-next/src/components/common/SafeImage.jsx
'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  canUseNextImage,
  DEFAULT_PLACEHOLDER_IMAGE,
  normalizeImageCandidates,
  normalizeImageUrl,
  shouldBypassNextImageOptimization,
} from '../../lib/image';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

const buildSourceList = (
  src,
  fallbackCandidates = [],
  fallbackSrc = DEFAULT_PLACEHOLDER_IMAGE
) => {
  const normalized = normalizeImageCandidates([
    src,
    ...toArray(fallbackCandidates),
    fallbackSrc,
  ]);

  if (!normalized.length) return [DEFAULT_PLACEHOLDER_IMAGE];
  return normalized;
};

export default function SafeImage({
  src,
  alt = '',
  fallbackSrc = DEFAULT_PLACEHOLDER_IMAGE,
  fallbackCandidates = [],
  onError,
  fill = false,
  priority = false,
  loading,
  className = '',
  style,
  sizes,
  width,
  height,
  quality,
  unoptimized,
  ...rest
}) {
  const sourceKey = useMemo(
    () =>
      JSON.stringify([
        src,
        ...toArray(fallbackCandidates),
        fallbackSrc || DEFAULT_PLACEHOLDER_IMAGE,
      ]),
    [src, fallbackCandidates, fallbackSrc]
  );

  const sources = useMemo(
    () => buildSourceList(src, fallbackCandidates, fallbackSrc),
    [sourceKey]
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sourceKey]);

  const currentSrc =
    sources[activeIndex] ||
    normalizeImageUrl(fallbackSrc, DEFAULT_PLACEHOLDER_IMAGE);

  const nextSafe = canUseNextImage(currentSrc);

  // ✅ Main fix:
  // Remote absolute URLs (CDN/TMDb/etc) bypass Vercel /_next/image optimization
  // so production stops throwing 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED.
  const resolvedUnoptimized =
    typeof unoptimized === 'boolean'
      ? unoptimized
      : shouldBypassNextImageOptimization(currentSrc);

  const handleError = (e) => {
    if (activeIndex < sources.length - 1) {
      setActiveIndex((prev) => prev + 1);
    }
    onError?.(e);
  };

  const imgStyle = fill
    ? {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      ...style,
    }
    : style;

  if (nextSafe) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        loading={priority ? undefined : loading}
        sizes={sizes}
        quality={quality}
        unoptimized={resolvedUnoptimized}
        className={className}
        style={style}
        onError={handleError}
        {...rest}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      style={imgStyle}
      loading={priority ? 'eager' : loading || 'lazy'}
      decoding="async"
      onError={handleError}
      {...rest}
    />
  );
}
