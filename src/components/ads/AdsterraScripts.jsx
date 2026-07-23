// frontend-next/src/components/ads/AdsterraScripts.jsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { FEEDBACK_MODAL_OPEN_CHANGE_EVENT } from '../../lib/events';

const ADS_ENABLED =
  String(process.env.NEXT_PUBLIC_ADS_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';

const PROFITABLE_POPUNDER_SCRIPT_SRC = String(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_SCRIPT_SRC ||
  'https://pl27010453.profitablecpmratenetwork.com/62/c8/f3/62c8f34a5a4d1afbb8ec9a7b28896caa.js'
).trim();

/**
 * Zero means immediate.
 *
 * Set this in Vercel:
 * NEXT_PUBLIC_PROFITABLE_POPUNDER_INITIAL_DELAY_MS=0
 */
const readNonNegativeMs = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.floor(number)
    : fallback;
};

const INITIAL_DELAY_MS = readNonNegativeMs(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_INITIAL_DELAY_MS,
  0
);

/**
 * Existing behavior was to reload the popunder script every 30 seconds.
 *
 * Use:
 * - 30000 to preserve that behavior
 * - 0 to load the script only once per eligible route
 */
const REPEAT_DELAY_RAW_MS = readNonNegativeMs(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_REPEAT_DELAY_MS,
  30_000
);

const REPEAT_DELAY_MS =
  REPEAT_DELAY_RAW_MS > 0
    ? Math.max(5_000, REPEAT_DELAY_RAW_MS)
    : 0;

const SCRIPT_ID = 'flixmovo-profitable-popunder-script';
const PRECONNECT_ID = 'flixmovo-profitable-popunder-preconnect';
const DNS_PREFETCH_ID = 'flixmovo-profitable-popunder-dns-prefetch';

const SCRIPT_ORIGIN = (() => {
  try {
    return new URL(PROFITABLE_POPUNDER_SCRIPT_SRC).origin;
  } catch {
    return '';
  }
})();

/**
 * Preserve the existing behavior of not showing popunders on:
 * - admin/dashboard pages
 * - account/private pages
 * - authentication pages
 * - public feedback form
 */
const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/viewer-feedback',
  '/movieslist',
  '/addmovie',
  '/edit',
  '/bulk-create',
  '/get-movies',
  '/update-movies',
  '/push-notification',
  '/categories',
  '/users',
  '/profile',
  '/password',
  '/favorites',

  '/blog-posts',
  '/blog-preview',
  '/get-blog-posts',
  '/bulk-create-blog-posts',
  '/update-blog-posts',
];

const EXCLUDED_EXACT = [
  '/login',
  '/register',
  '/signup',
  '/feedback',
];

const normalizePathname = (pathname = '') => {
  const raw = String(pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .trim();

  if (!raw || raw === '/') return '/';

  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;

  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '')
    : withLeadingSlash;
};

const shouldExcludePath = (pathname = '') => {
  const path = normalizePathname(pathname);

  if (EXCLUDED_EXACT.includes(path)) return true;

  return EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

const isFeedbackModalOpenNow = () => {
  if (typeof document === 'undefined') return false;

  try {
    return Boolean(
      document.body?.classList?.contains('mf-feedback-modal-open') ||
      document.documentElement?.classList?.contains(
        'mf-feedback-modal-open'
      ) ||
      document.body?.dataset?.mfFeedbackModalOpen === 'true' ||
      document.documentElement?.dataset?.mfFeedbackModalOpen === 'true'
    );
  } catch {
    return false;
  }
};

const removeInjectedScript = () => {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById(SCRIPT_ID);

  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
};

const ensureResourceHints = () => {
  if (typeof document === 'undefined' || !SCRIPT_ORIGIN) return;

  if (!document.getElementById(DNS_PREFETCH_ID)) {
    const dnsPrefetch = document.createElement('link');

    dnsPrefetch.id = DNS_PREFETCH_ID;
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = SCRIPT_ORIGIN;

    document.head.appendChild(dnsPrefetch);
  }

  if (!document.getElementById(PRECONNECT_ID)) {
    const preconnect = document.createElement('link');

    preconnect.id = PRECONNECT_ID;
    preconnect.rel = 'preconnect';
    preconnect.href = SCRIPT_ORIGIN;
    preconnect.crossOrigin = 'anonymous';

    document.head.appendChild(preconnect);
  }
};

const isValidScriptSource = () => {
  if (!PROFITABLE_POPUNDER_SCRIPT_SRC) return false;

  try {
    const url = new URL(PROFITABLE_POPUNDER_SCRIPT_SRC);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function AdsterraScripts() {
  const pathname = usePathname() || '/';

  const excluded = useMemo(
    () => shouldExcludePath(pathname),
    [pathname]
  );

  const lastInjectAtRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let feedbackPaused = isFeedbackModalOpenNow();

    let initialTimerId = null;
    let repeatTimerId = null;

    const clearTimers = () => {
      if (initialTimerId !== null) {
        window.clearTimeout(initialTimerId);
        initialTimerId = null;
      }

      if (repeatTimerId !== null) {
        window.clearInterval(repeatTimerId);
        repeatTimerId = null;
      }
    };

    const canInjectNow = () => {
      if (disposed) return false;
      if (!ADS_ENABLED) return false;
      if (excluded) return false;
      if (feedbackPaused || isFeedbackModalOpenNow()) return false;
      if (!isValidScriptSource()) return false;

      // A prerendered/background tab can wait until it becomes visible.
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return false;
      }

      return true;
    };

    const injectScript = ({ force = false } = {}) => {
      if (!canInjectNow()) return false;

      const now = Date.now();
      const existing = document.getElementById(SCRIPT_ID);

      if (existing && !force) {
        return true;
      }

      /**
       * Prevent accidental duplicate requests caused by several focus/visibility
       * events firing together.
       */
      if (
        !force &&
        lastInjectAtRef.current &&
        now - lastInjectAtRef.current < 5_000
      ) {
        return false;
      }

      ensureResourceHints();

      if (existing?.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      const script = document.createElement('script');

      script.id = SCRIPT_ID;
      script.type = 'text/javascript';
      script.async = true;
      script.src = PROFITABLE_POPUNDER_SCRIPT_SRC;

      script.setAttribute('data-cfasync', 'false');
      script.setAttribute(
        'data-flixmovo-route',
        normalizePathname(pathname)
      );

      script.addEventListener(
        'error',
        () => {
          const current = document.getElementById(SCRIPT_ID);

          if (current === script) {
            current.remove();
          }
        },
        { once: true }
      );

      const target =
        document.body ||
        document.head ||
        document.documentElement;

      target.appendChild(script);

      lastInjectAtRef.current = now;

      return true;
    };

    const startRepeatTimer = () => {
      if (REPEAT_DELAY_MS <= 0) return;
      if (repeatTimerId !== null) return;

      repeatTimerId = window.setInterval(() => {
        if (!canInjectNow()) return;

        injectScript({ force: true });
      }, REPEAT_DELAY_MS);
    };

    const activate = () => {
      if (disposed) return;
      if (!canInjectNow()) return;

      injectScript({ force: false });
      startRepeatTimer();
    };

    const start = () => {
      clearTimers();

      if (disposed) return;

      feedbackPaused = isFeedbackModalOpenNow();

      if (!ADS_ENABLED || excluded || feedbackPaused) {
        removeInjectedScript();
        return;
      }

      if (INITIAL_DELAY_MS <= 0) {
        // Main change: inject immediately without an artificial delay.
        activate();
        return;
      }

      initialTimerId = window.setTimeout(() => {
        initialTimerId = null;
        activate();
      }, INITIAL_DELAY_MS);
    };

    const onFeedbackOpenChange = (event) => {
      const open =
        typeof event?.detail?.open === 'boolean'
          ? event.detail.open
          : isFeedbackModalOpenNow();

      feedbackPaused = open;

      if (open) {
        clearTimers();
        removeInjectedScript();
        return;
      }

      // Feedback was closed: allow immediate loading again.
      lastInjectAtRef.current = 0;
      start();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (feedbackPaused || isFeedbackModalOpenNow()) return;

      activate();
    };

    const onFocus = () => {
      if (feedbackPaused || isFeedbackModalOpenNow()) return;

      activate();
    };

    const onPageShow = () => {
      if (feedbackPaused || isFeedbackModalOpenNow()) return;

      activate();
    };

    if (!ADS_ENABLED || excluded || !isValidScriptSource()) {
      clearTimers();
      removeInjectedScript();
      lastInjectAtRef.current = 0;

      return () => {
        clearTimers();
        removeInjectedScript();
      };
    }

    start();

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);

    window.addEventListener(
      FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
      onFeedbackOpenChange
    );

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );

    return () => {
      disposed = true;

      clearTimers();

      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);

      window.removeEventListener(
        FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
        onFeedbackOpenChange
      );

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );

      removeInjectedScript();
      lastInjectAtRef.current = 0;
    };
  }, [excluded, pathname]);

  return null;
}
