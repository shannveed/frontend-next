'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';

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

// keep ads off account/admin/auth routes
const EXCLUDED_PREFIXES = [
  '/dashboard',
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
const EXCLUDED_EXACT = ['/login', '/register'];

const toSafeDelay = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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

  // We control injection timing here.
  // Exact popup behavior is still ultimately controlled by the ad network script.
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
    if (!ADS_ENABLED || isExcluded) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!PROFITABLE_POPUNDER_SCRIPT_SRC) return;

    // Guard against React StrictMode double-effects
    if (window.__MF_PROFITABLE_POPUNDER_BOOTSTRAPPED__) return;
    window.__MF_PROFITABLE_POPUNDER_BOOTSTRAPPED__ = true;

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
      if (document.visibilityState !== 'visible') return;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;

      const now = Date.now();

      // Keep at least the requested gap between re-injections
      if (
        lastInjectAtRef.current &&
        now - lastInjectAtRef.current < repeatDelay - 250
      ) {
        return;
      }

      injectProfitablePopunderScript();
      lastInjectAtRef.current = now;
    };

    const startRepeater = () => {
      if (repeatTimerRef.current) return;

      repeatTimerRef.current = window.setInterval(() => {
        if (!activatedRef.current) return;
        injectIfAllowed();
      }, repeatDelay);
    };

    const activate = () => {
      activatedRef.current = true;
      initialTimerRef.current = null;

      // First load after 1 minute
      injectIfAllowed();

      // Then re-inject every 30 seconds
      startRepeater();
    };

    initialTimerRef.current = window.setTimeout(activate, initialDelay);

    const onVisibilityChange = () => {
      if (!activatedRef.current) return;
      if (document.visibilityState === 'visible') {
        injectIfAllowed();
      }
    };

    window.addEventListener('focus', injectIfAllowed);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearAll();
      window.removeEventListener('focus', injectIfAllowed);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      activatedRef.current = false;
      lastInjectAtRef.current = 0;

      removeInjectedScript();
      window.__MF_PROFITABLE_POPUNDER_BOOTSTRAPPED__ = false;
    };
  }, [isExcluded]);

  return null;
}
