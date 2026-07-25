// frontend-next/src/components/ads/AdsterraScripts.jsx
'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { FEEDBACK_MODAL_OPEN_CHANGE_EVENT } from '../../lib/events';

const ADS_ENABLED =
  String(process.env.NEXT_PUBLIC_ADS_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';

const normalizeScriptUrl = (value = '') => {
  const source = String(value || '').trim();

  if (!source) return '';
  if (source.startsWith('//')) return `https:${source}`;

  return source;
};

/**
 * New Adsterra variable is preferred.
 * The old variable is retained temporarily for backward compatibility.
 */
const POPUNDER_SCRIPT_SRC = normalizeScriptUrl(
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_SCRIPT_SRC ||
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_SCRIPT_SRC ||
  ''
);

const readNonNegativeInteger = (value, fallback = 0) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.floor(number)
    : fallback;
};

const INITIAL_DELAY_MS = readNonNegativeInteger(
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_INITIAL_DELAY_MS ??
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_INITIAL_DELAY_MS,
  0
);

const REPEAT_DELAY_MS = readNonNegativeInteger(
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_REPEAT_DELAY_MS ??
  process.env.NEXT_PUBLIC_PROFITABLE_POPUNDER_REPEAT_DELAY_MS,
  0
);

const SCRIPT_ID = 'flixmovo-adsterra-popunder-script';
const PRECONNECT_ID = 'flixmovo-adsterra-preconnect';
const DNS_PREFETCH_ID = 'flixmovo-adsterra-dns-prefetch';

const GLOBAL_STATE_KEY =
  '__FLIXMOVO_ADSTERRA_POPUNDER_STATE__';

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

const EXCLUDED_EXACT = new Set([
  '/login',
  '/register',
  '/signup',
  '/feedback',
]);

const normalizePathname = (pathname = '') => {
  const raw = String(pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .trim();

  if (!raw || raw === '/') return '/';

  const path = raw.startsWith('/') ? raw : `/${raw}`;

  return path.length > 1
    ? path.replace(/\/+$/, '')
    : path;
};

const shouldExcludePath = (pathname = '') => {
  const path = normalizePathname(pathname);

  if (EXCLUDED_EXACT.has(path)) return true;

  return EXCLUDED_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`)
  );
};

const isFeedbackOpen = () => {
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

const isAuthenticatedNow = () => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem('userInfo');
    const user = raw ? JSON.parse(raw) : null;

    return Boolean(user?.token || user?.isAdmin);
  } catch {
    return false;
  }
};

const isValidScriptSource = () => {
  if (!POPUNDER_SCRIPT_SRC) return false;

  try {
    const url = new URL(POPUNDER_SCRIPT_SRC);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

const ensureGlobalState = () => {
  if (!window[GLOBAL_STATE_KEY]) {
    window[GLOBAL_STATE_KEY] = {
      source: '',
      loading: false,
      loaded: false,
      lastLoadedAt: 0,
    };
  }

  return window[GLOBAL_STATE_KEY];
};

const ensureResourceHints = () => {
  if (!POPUNDER_SCRIPT_SRC) return;

  let origin = '';

  try {
    origin = new URL(POPUNDER_SCRIPT_SRC).origin;
  } catch {
    return;
  }

  if (!document.getElementById(DNS_PREFETCH_ID)) {
    const dns = document.createElement('link');

    dns.id = DNS_PREFETCH_ID;
    dns.rel = 'dns-prefetch';
    dns.href = origin;

    document.head.appendChild(dns);
  }

  if (!document.getElementById(PRECONNECT_ID)) {
    const preconnect = document.createElement('link');

    preconnect.id = PRECONNECT_ID;
    preconnect.rel = 'preconnect';
    preconnect.href = origin;
    preconnect.crossOrigin = 'anonymous';

    document.head.appendChild(preconnect);
  }
};

const injectPopunderScript = ({ force = false } = {}) => {
  if (typeof window === 'undefined') return false;
  if (!isValidScriptSource()) return false;

  const state = ensureGlobalState();
  const existing = document.getElementById(SCRIPT_ID);

  if (
    !force &&
    state.source === POPUNDER_SCRIPT_SRC &&
    (state.loading || state.loaded)
  ) {
    return true;
  }

  if (!force && existing) {
    return true;
  }

  if (force && existing) {
    existing.remove();
  }

  ensureResourceHints();

  const script = document.createElement('script');

  script.id = SCRIPT_ID;
  script.async = true;
  script.type = 'text/javascript';
  script.src = POPUNDER_SCRIPT_SRC;
  script.setAttribute('data-cfasync', 'false');

  state.source = POPUNDER_SCRIPT_SRC;
  state.loading = true;
  state.loaded = false;

  script.addEventListener(
    'load',
    () => {
      state.loading = false;
      state.loaded = true;
      state.lastLoadedAt = Date.now();
    },
    { once: true }
  );

  script.addEventListener(
    'error',
    () => {
      state.loading = false;
      state.loaded = false;

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    },
    { once: true }
  );

  (document.body || document.head).appendChild(script);

  return true;
};

export default function AdsterraScripts() {
  const pathname = usePathname() || '/';

  const excluded = useMemo(
    () => shouldExcludePath(pathname),
    [pathname]
  );

  useEffect(() => {
    if (!ADS_ENABLED) return;
    if (excluded) return;
    if (!isValidScriptSource()) return;
    if (isAuthenticatedNow()) return;

    let disposed = false;
    let paused = isFeedbackOpen();

    let initialTimer = null;
    let repeatTimer = null;

    const canRun = () => {
      if (disposed) return false;
      if (paused || isFeedbackOpen()) return false;
      if (isAuthenticatedNow()) return false;

      return document.visibilityState !== 'hidden';
    };

    const activate = () => {
      if (!canRun()) return;

      injectPopunderScript();
    };

    if (INITIAL_DELAY_MS <= 0) {
      activate();
    } else {
      initialTimer = window.setTimeout(
        activate,
        INITIAL_DELAY_MS
      );
    }

    /**
     * Recommended value is zero. Adsterra should control frequency
     * from its dashboard. Repeated script execution can duplicate
     * click handlers.
     */
    if (REPEAT_DELAY_MS > 0) {
      repeatTimer = window.setInterval(() => {
        if (!canRun()) return;

        injectPopunderScript({ force: true });
      }, Math.max(REPEAT_DELAY_MS, 30000));
    }

    const onFeedbackChange = (event) => {
      paused =
        typeof event?.detail?.open === 'boolean'
          ? event.detail.open
          : isFeedbackOpen();

      if (!paused) {
        activate();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        activate();
      }
    };

    const onStorage = () => {
      if (!isAuthenticatedNow()) {
        activate();
      }
    };

    window.addEventListener(
      FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
      onFeedbackChange
    );

    window.addEventListener('storage', onStorage);

    document.addEventListener(
      'visibilitychange',
      onVisible
    );

    return () => {
      disposed = true;

      if (initialTimer !== null) {
        window.clearTimeout(initialTimer);
      }

      if (repeatTimer !== null) {
        window.clearInterval(repeatTimer);
      }

      window.removeEventListener(
        FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
        onFeedbackChange
      );

      window.removeEventListener('storage', onStorage);

      document.removeEventListener(
        'visibilitychange',
        onVisible
      );

      /**
       * Do not remove a successfully executed popunder script during
       * App Router navigation. Removing the tag cannot remove event
       * handlers already registered by the third-party script and
       * reinjecting it can duplicate them.
       */
    };
  }, [excluded, pathname]);

  return null;
}
