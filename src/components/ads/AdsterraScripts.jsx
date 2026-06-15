// frontend-next/src/components/ads/AdsterraScripts.jsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { FEEDBACK_MODAL_OPEN_CHANGE_EVENT } from '../../lib/events';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const PROFITABLE_POPUNDER_SCRIPT_SRC = String(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_SCRIPT_SRC ||
  'https://pl27010453.profitablecpmratenetwork.com/62/c8/f3/62c8f34a5a4d1afbb8ec9a7b28896caa.js'
).trim();

const PROFITABLE_POPUNDER_INITIAL_DELAY_MS = Number(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_INITIAL_DELAY_MS || 60_000
);

const PROFITABLE_POPUNDER_REPEAT_DELAY_MS = Number(
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_REPEAT_DELAY_MS || 30_000
);

/**
 * TMDb virtual pages should load the popunder script too.
 * Shorter delay helps because these dynamic virtual pages are often entered directly.
 *
 * Optional env override:
 * NEXT_PUBLIC_TMDB_VIRTUAL_POPUNDER_INITIAL_DELAY_MS=3000
 */
const TMDB_VIRTUAL_POPUNDER_INITIAL_DELAY_MS = Number(
  process.env.NEXT_PUBLIC_TMDB_VIRTUAL_POPUNDER_INITIAL_DELAY_MS || 3_000
);

const SCRIPT_ID = 'mf-profitable-popunder-script';

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
];

const EXCLUDED_EXACT = ['/login', '/register', '/feedback'];

const toSafeDelay = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const normalizePathname = (pathname = '') => {
  const raw = String(pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .trim();

  if (!raw || raw === '/') return '/';

  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;

  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
};

const isTmdbVirtualPopunderPath = (pathname = '') => {
  const path = normalizePathname(pathname);

  return /^\/(?:movie|watch)\/tmdb\/(?:movie|tv)\/[^/]+$/i.test(path);
};

const shouldExcludePath = (pathname = '') => {
  const path = normalizePathname(pathname);

  /**
   * Important:
   * TMDb virtual movie/watch pages must be eligible even if future exclusions
   * become broader.
   */
  if (isTmdbVirtualPopunderPath(path)) return false;

  if (EXCLUDED_EXACT.includes(path)) return true;

  return EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

const isFeedbackModalOpenNow = () => {
  if (typeof document === 'undefined') return false;

  try {
    return !!(
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

const injectProfitablePopunderScript = () => {
  if (typeof document === 'undefined') return;
  if (!PROFITABLE_POPUNDER_SCRIPT_SRC) return;

  removeInjectedScript();

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'text/javascript';
  script.async = true;
  script.src = PROFITABLE_POPUNDER_SCRIPT_SRC;
  script.setAttribute('data-cfasync', 'false');

  (document.body || document.documentElement).appendChild(script);
};

export default function AdsterraScripts() {
  const pathname = usePathname() || '/';

  const isTmdbVirtualPage = useMemo(
    () => isTmdbVirtualPopunderPath(pathname),
    [pathname]
  );

  const isExcluded = useMemo(() => shouldExcludePath(pathname), [pathname]);

  const activatedRef = useRef(false);
  const initialTimerRef = useRef(null);
  const repeatTimerRef = useRef(null);
  const lastInjectAtRef = useRef(0);

  useEffect(() => {
    const clearAllTimers = () => {
      if (initialTimerRef.current) {
        window.clearTimeout(initialTimerRef.current);
      }

      if (repeatTimerRef.current) {
        window.clearInterval(repeatTimerRef.current);
      }

      initialTimerRef.current = null;
      repeatTimerRef.current = null;
    };

    if (!ADS_ENABLED || isExcluded) {
      clearAllTimers();
      activatedRef.current = false;
      lastInjectAtRef.current = 0;
      removeInjectedScript();
      return () => { };
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => { };
    }

    if (!PROFITABLE_POPUNDER_SCRIPT_SRC) return () => { };

    const initialDelay = isTmdbVirtualPage
      ? toSafeDelay(TMDB_VIRTUAL_POPUNDER_INITIAL_DELAY_MS, 3_000)
      : toSafeDelay(PROFITABLE_POPUNDER_INITIAL_DELAY_MS, 60_000);

    const repeatDelay = Math.max(
      1_000,
      toSafeDelay(PROFITABLE_POPUNDER_REPEAT_DELAY_MS, 30_000)
    );

    const clearAll = () => {
      clearAllTimers();
    };

    const injectIfAllowed = () => {
      if (isFeedbackModalOpenNow()) {
        removeInjectedScript();
        return;
      }

      if (document.visibilityState !== 'visible') return;

      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        return;
      }

      const now = Date.now();

      if (
        lastInjectAtRef.current &&
        now - lastInjectAtRef.current < repeatDelay
      ) {
        return;
      }

      lastInjectAtRef.current = now;
      injectProfitablePopunderScript();
    };

    const startRepeater = () => {
      if (repeatTimerRef.current) return;

      repeatTimerRef.current = window.setInterval(() => {
        if (!activatedRef.current) return;
        injectIfAllowed();
      }, repeatDelay);
    };

    const activate = () => {
      if (isFeedbackModalOpenNow()) {
        removeInjectedScript();
        return;
      }

      activatedRef.current = true;
      initialTimerRef.current = null;

      injectIfAllowed();
      startRepeater();
    };

    const startInitialTimer = () => {
      clearAll();

      activatedRef.current = false;
      lastInjectAtRef.current = 0;

      if (isFeedbackModalOpenNow()) {
        removeInjectedScript();
        return;
      }

      initialTimerRef.current = window.setTimeout(activate, initialDelay);
    };

    const onFeedbackOpenChange = (event) => {
      const open =
        typeof event?.detail?.open === 'boolean'
          ? event.detail.open
          : isFeedbackModalOpenNow();

      if (open) {
        clearAll();
        activatedRef.current = false;
        lastInjectAtRef.current = 0;
        removeInjectedScript();
        return;
      }

      startInitialTimer();
    };

    const onVisibilityChange = () => {
      if (!activatedRef.current) return;

      if (document.visibilityState === 'visible') {
        injectIfAllowed();
      }
    };

    const onFocus = () => {
      if (!activatedRef.current) return;
      injectIfAllowed();
    };

    startInitialTimer();

    window.addEventListener('focus', onFocus);
    window.addEventListener(
      FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
      onFeedbackOpenChange
    );
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearAll();

      window.removeEventListener('focus', onFocus);
      window.removeEventListener(
        FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
        onFeedbackOpenChange
      );
      document.removeEventListener('visibilitychange', onVisibilityChange);

      activatedRef.current = false;
      lastInjectAtRef.current = 0;

      removeInjectedScript();
    };
  }, [isExcluded, isTmdbVirtualPage, pathname]);

  return null;
}
