// frontend-next/src/components/ads/EffectiveGateNativeBanner.jsx
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FEEDBACK_MODAL_OPEN_CHANGE_EVENT } from '../../lib/events';

const LEGACY_SCRIPT_SRC =
  'https://pl27041508.effectivegatecpm.com/019a973cec8ffe0b4ea36cff849dc6cf/invoke.js';

const LEGACY_CONTAINER_ID =
  'container-019a973cec8ffe0b4ea36cff849dc6cf';

const normalizeScriptUrl = (value = '') => {
  const source = String(value || '').trim();

  if (!source) return '';
  if (source.startsWith('//')) return `https:${source}`;

  return source;
};

const normalizeContainerId = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

const COMMON_SCRIPT_SRC = normalizeScriptUrl(
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SCRIPT_SRC ||
  LEGACY_SCRIPT_SRC
);

const COMMON_CONTAINER_ID = normalizeContainerId(
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID ||
  LEGACY_CONTAINER_ID
);

const DESKTOP_SCRIPT_SRC = normalizeScriptUrl(
  process.env
    .NEXT_PUBLIC_ADSTERRA_NATIVE_DESKTOP_SCRIPT_SRC ||
  COMMON_SCRIPT_SRC
);

const DESKTOP_CONTAINER_ID = normalizeContainerId(
  process.env
    .NEXT_PUBLIC_ADSTERRA_NATIVE_DESKTOP_CONTAINER_ID ||
  COMMON_CONTAINER_ID
);

const MOBILE_SCRIPT_SRC = normalizeScriptUrl(
  process.env
    .NEXT_PUBLIC_ADSTERRA_NATIVE_MOBILE_SCRIPT_SRC ||
  COMMON_SCRIPT_SRC
);

const MOBILE_CONTAINER_ID = normalizeContainerId(
  process.env
    .NEXT_PUBLIC_ADSTERRA_NATIVE_MOBILE_CONTAINER_ID ||
  COMMON_CONTAINER_ID
);

const escapeAttribute = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const isValidConfig = ({ scriptSrc, containerId }) => {
  if (!scriptSrc || !containerId) return false;

  try {
    const url = new URL(scriptSrc);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

const buildSrcDoc = ({ containerId, scriptSrc }) => {
  const safeContainer = escapeAttribute(containerId);
  const safeScript = escapeAttribute(scriptSrc);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1"
    />
    <base target="_blank" />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }

      #${safeContainer} {
        width: 100%;
        min-height: 100%;
      }
    </style>
  </head>

  <body>
    <div id="${safeContainer}"></div>
    <script
      async
      data-cfasync="false"
      src="${safeScript}"
    ></script>
  </body>
</html>`;
};

const buildMediaQuery = ({
  minWidthPx,
  maxWidthPx,
}) => {
  const conditions = [];

  const min = Number(minWidthPx);
  const max = Number(maxWidthPx);

  if (Number.isFinite(min) && min >= 0) {
    conditions.push(`(min-width: ${min}px)`);
  }

  if (Number.isFinite(max) && max >= 0) {
    conditions.push(`(max-width: ${max}px)`);
  }

  return conditions.length
    ? conditions.join(' and ')
    : '(min-width: 0px)';
};

const isFeedbackOpenNow = () => {
  if (typeof document === 'undefined') return false;

  return Boolean(
    document.body?.classList?.contains(
      'mf-feedback-modal-open'
    ) ||
    document.documentElement?.classList?.contains(
      'mf-feedback-modal-open'
    ) ||
    document.body?.dataset?.mfFeedbackModalOpen ===
    'true' ||
    document.documentElement?.dataset
      ?.mfFeedbackModalOpen === 'true'
  );
};

const useFeedbackOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setOpen(isFeedbackOpenNow());
    };

    const onEvent = (event) => {
      if (typeof event?.detail?.open === 'boolean') {
        setOpen(event.detail.open);
      } else {
        update();
      }
    };

    update();

    window.addEventListener(
      FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
      onEvent
    );

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(update)
        : null;

    if (observer && document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          'class',
          'data-mf-feedback-modal-open',
        ],
      });
    }

    if (observer && document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: [
          'class',
          'data-mf-feedback-modal-open',
        ],
      });
    }

    return () => {
      window.removeEventListener(
        FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
        onEvent
      );

      observer?.disconnect();
    };
  }, []);

  return open;
};

const useMediaQuery = (query, enabled = true) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!enabled || !window.matchMedia) return;

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();

    if (media.addEventListener) {
      media.addEventListener('change', update);
    } else {
      media.addListener(update);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update);
      } else {
        media.removeListener(update);
      }
    };
  }, [query, enabled]);

  return matches;
};

function AdShell({
  label,
  className = '',
  aspectRatio,
  minHeight,
  shellRef,
  children,
}) {
  return (
    <section
      data-mf-ad-slot="true"
      className={`mf-ad-slot w-full my-8 ${className}`}
      aria-label={label || 'Advertisement'}
    >
      <div className="border border-border bg-dry rounded-lg p-3 sm:p-4">
        {label ? (
          <div className="mb-2">
            <span className="text-xs text-dryGray">
              {label}
            </span>
          </div>
        ) : null}

        <div
          ref={shellRef}
          className="w-full overflow-hidden rounded-md bg-main"
          style={{
            aspectRatio,
            minHeight,
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function AdsterraNativeIframe({
  scriptSrc,
  containerId,
  minWidthPx,
  maxWidthPx,
  aspectRatio,
  minHeight,
  rootMargin = '300px',
  className = '',
  label = 'Advertisement',
  refreshKey = '',
  iframeTitle = '',
}) {
  const configValid = isValidConfig({
    scriptSrc,
    containerId,
  });

  const query = useMemo(
    () =>
      buildMediaQuery({
        minWidthPx,
        maxWidthPx,
      }),
    [minWidthPx, maxWidthPx]
  );

  const [mounted, setMounted] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  const shellRef = useRef(null);
  const feedbackOpen = useFeedbackOpen();

  const matches = useMediaQuery(query, mounted);

  const frameKey = useMemo(
    () =>
      [
        containerId,
        scriptSrc,
        refreshKey,
        query,
        aspectRatio,
      ].join(':'),
    [
      containerId,
      scriptSrc,
      refreshKey,
      query,
      aspectRatio,
    ]
  );

  const srcDoc = useMemo(
    () =>
      configValid
        ? buildSrcDoc({
          containerId,
          scriptSrc,
        })
        : '',
    [configValid, containerId, scriptSrc]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShouldLoad(false);
  }, [frameKey]);

  useEffect(() => {
    if (!configValid) return;
    if (!mounted || !matches || feedbackOpen) return;
    if (shouldLoad) return;

    const element = shellRef.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !isFeedbackOpenNow()
        ) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [
    configValid,
    mounted,
    matches,
    feedbackOpen,
    shouldLoad,
    rootMargin,
  ]);

  if (!configValid || feedbackOpen) return null;

  if (!mounted) {
    return (
      <AdShell
        label={label}
        className={className}
        aspectRatio={aspectRatio}
        minHeight={minHeight}
      />
    );
  }

  if (!matches) return null;

  return (
    <AdShell
      label={label}
      className={className}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
      shellRef={shellRef}
    >
      {shouldLoad ? (
        <iframe
          key={frameKey}
          title={
            iframeTitle ||
            `flixmovo-native-ad-${refreshKey || 'default'}`
          }
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="w-full h-full"
          style={{
            border: 0,
            display: 'block',
          }}
          scrolling="no"
          loading="lazy"
          referrerPolicy="no-referrer-when-cross-origin"
        />
      ) : null}
    </AdShell>
  );
}

export default function EffectiveGateNativeBanner({
  scriptSrc = DESKTOP_SCRIPT_SRC,
  containerId = DESKTOP_CONTAINER_ID,
  minWidthPx = 640,
  aspectRatio = '4 / 1',
  minHeight = 90,
  ...props
}) {
  return (
    <AdsterraNativeIframe
      {...props}
      scriptSrc={scriptSrc}
      containerId={containerId}
      minWidthPx={minWidthPx}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
    />
  );
}

export function EffectiveGateSquareAd({
  scriptSrc = MOBILE_SCRIPT_SRC,
  containerId = MOBILE_CONTAINER_ID,
  maxWidthPx = 639,
  aspectRatio = '1 / 1',
  minHeight = 260,
  ...props
}) {
  return (
    <AdsterraNativeIframe
      {...props}
      scriptSrc={scriptSrc}
      containerId={containerId}
      maxWidthPx={maxWidthPx}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
    />
  );
}
