'use client';

import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_SCRIPT_SRC =
  'https://pl27041508.effectivegatecpm.com/019a973cec8ffe0b4ea36cff849dc6cf/invoke.js';

const DEFAULT_CONTAINER_ID = 'container-019a973cec8ffe0b4ea36cff849dc6cf';

const buildSrcDoc = ({ containerId, scriptSrc }) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      #${containerId} { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="${containerId}"></div>
    <script async data-cfasync="false" src="${scriptSrc}"></script>
  </body>
</html>`;

const buildMediaQuery = ({ minWidthPx, maxWidthPx }) => {
  const parts = [];

  const min = Number(minWidthPx);
  const max = Number(maxWidthPx);

  if (Number.isFinite(min) && min >= 0) parts.push(`(min-width: ${min}px)`);
  if (Number.isFinite(max) && max >= 0) parts.push(`(max-width: ${max}px)`);

  return parts.length ? parts.join(' and ') : '(min-width: 0px)';
};

// ✅ SSR-safe: first render always "false"
const useMediaQuery = (query, enabled = true) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);

    update();

    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
    };
  }, [query, enabled]);

  return matches;
};

function EffectiveGateIframeAd({
  scriptSrc = DEFAULT_SCRIPT_SRC,
  containerId = DEFAULT_CONTAINER_ID,

  // responsive gating
  minWidthPx,
  maxWidthPx,

  // layout
  aspectRatio = '4 / 1',
  minHeight = 90,

  // UI
  className = '',
  label = 'Advertisement',

  refreshKey = '',
  iframeTitle,
}) {
  const query = useMemo(
    () => buildMediaQuery({ minWidthPx, maxWidthPx }),
    [minWidthPx, maxWidthPx]
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Only evaluate media query after mount (prevents SSR/client mismatch)
  const matches = useMediaQuery(query, mounted);

  const srcDoc = useMemo(() => buildSrcDoc({ containerId, scriptSrc }), [
    containerId,
    scriptSrc,
  ]);

  const iframeKey = useMemo(() => {
    return `${containerId}:${String(refreshKey)}:${scriptSrc}:${query}:${aspectRatio}`;
  }, [containerId, refreshKey, scriptSrc, query, aspectRatio]);

  // ✅ placeholder until mounted (SSR-safe and avoids hydration mismatch)
  if (!mounted) {
    return (
      <section className={`w-full my-8 ${className}`} aria-label={label || 'Advertisement'}>
        <div className="border border-border bg-dry rounded-lg p-3 sm:p-4">
          {label ? (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dryGray">{label}</span>
            </div>
          ) : null}

          <div
            className="w-full overflow-hidden rounded-md bg-main"
            style={{ aspectRatio, minHeight }}
          />
        </div>
      </section>
    );
  }

  if (!matches) return null;

  const title = iframeTitle || `effectivegate-ad-${String(refreshKey || 'default')}`;

  return (
    <section className={`w-full my-8 ${className}`} aria-label={label || 'Advertisement'}>
      <div className="border border-border bg-dry rounded-lg p-3 sm:p-4">
        {label ? (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dryGray">{label}</span>
          </div>
        ) : null}

        <div
          className="w-full overflow-hidden rounded-md bg-main"
          style={{ aspectRatio, minHeight }}
        >
          <iframe
            key={iframeKey}
            title={title}
            srcDoc={srcDoc}
            className="w-full h-full"
            style={{ border: 0, display: 'block' }}
            scrolling="no"
            loading="eager"
            referrerPolicy="no-referrer-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * ✅ Desktop default (4:1) – shows on >= 640px
 */
export default function EffectiveGateNativeBanner({
  minWidthPx = 640,
  aspectRatio = '4 / 1',
  minHeight = 90,
  ...props
}) {
  return (
    <EffectiveGateIframeAd
      {...props}
      minWidthPx={minWidthPx}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
    />
  );
}

/**
 * ✅ Mobile default (1:1) – shows on <= 639px
 */
export function EffectiveGateSquareAd({
  maxWidthPx = 639,
  aspectRatio = '1 / 1',
  minHeight = 260,
  ...props
}) {
  return (
    <EffectiveGateIframeAd
      {...props}
      maxWidthPx={maxWidthPx}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
    />
  );
}
