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

  const isExcluded = useMemo(() => {
    if (!pathname) return false;
    if (EXCLUDED_EXACT.includes(pathname)) return true;
    return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
  }, [pathname]);

  const activatedRef = useRef(false);
  const initialTimerRef = useRef(null);
  const repeatTimerRef = useRef(null);
  const lastInjectAtRef = useRef(0);

  useEffect(() => {
    if (!ADS_ENABLED || isExcluded) {
      removeInjectedScript();
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!PROFITABLE_POPUNDER_SCRIPT_SRC) return;

    if (window.MF_PROFITABLE_POPUNDER_BOOTSTRAPPED) return;
    window.MF_PROFITABLE_POPUNDER_BOOTSTRAPPED = true;

    const initialDelay = toSafeDelay(
      PROFITABLE_POPUNDER_INITIAL_DELAY_MS,
      60_000
    );

    const repeatDelay = Math.max(
      1_000,
      toSafeDelay(PROFITABLE_POPUNDER_REPEAT_DELAY_MS, 30_000)
    );

    const clearAll = () => {
      if (initialTimerRef.current) clearTimeout(initialTimerRef.current);
      if (repeatTimerRef.current) clearInterval(repeatTimerRef.current);

      initialTimerRef.current = null;
      repeatTimerRef.current = null;
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

        window.MF_PROFITABLE_POPUNDER_BOOTSTRAPPED = false;
        return;
      }

      window.MF_PROFITABLE_POPUNDER_BOOTSTRAPPED = true;
      startInitialTimer();
    };

    if (!isFeedbackModalOpenNow()) {
      startInitialTimer();
    } else {
      removeInjectedScript();
    }

    const onVisibilityChange = () => {
      if (!activatedRef.current) return;
      if (document.visibilityState === 'visible') {
        injectIfAllowed();
      }
    };

    window.addEventListener('focus', injectIfAllowed);
    window.addEventListener(
      FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
      onFeedbackOpenChange
    );
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearAll();

      window.removeEventListener('focus', injectIfAllowed);
      window.removeEventListener(
        FEEDBACK_MODAL_OPEN_CHANGE_EVENT,
        onFeedbackOpenChange
      );
      document.removeEventListener('visibilitychange', onVisibilityChange);

      activatedRef.current = false;
      lastInjectAtRef.current = 0;

      removeInjectedScript();
      window.MF_PROFITABLE_POPUNDER_BOOTSTRAPPED = false;
    };
  }, [isExcluded]);

  return null;
}
