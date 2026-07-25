// frontend-next/src/components/modals/WebsiteFeedbackPrompt.jsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getUserInfo } from '../../lib/client/auth';

const FEEDBACK_PAGE_PATH = '/feedback';

const configuredMinutes = Number(
  process.env.NEXT_PUBLIC_FEEDBACK_ACTIVE_MINUTES || 15
);

const FEEDBACK_ACTIVE_MINUTES =
  Number.isFinite(configuredMinutes) &&
    configuredMinutes >= 1 &&
    configuredMinutes <= 180
    ? configuredMinutes
    : 15;

const ACTIVE_TIME_TARGET_MS =
  FEEDBACK_ACTIVE_MINUTES * 60 * 1000;

const SUBMIT_COOLDOWN_MS =
  60 * 24 * 60 * 60 * 1000; // 60 days

// v2 resets the old five-minute counter after this deployment.
const ACTIVE_MS_KEY = 'mf_feedback_active_ms_v2';

const LAST_SUBMITTED_AT_KEY =
  'mf_feedback_last_submitted_at_v1';

const DISMISSED_SESSION_KEY =
  'mf_feedback_dismissed_this_session_v1';

const RETURN_PATH_SESSION_KEY =
  'mf_feedback_return_path_v1';

const EXCLUDED_EXACT = [
  '/login',
  '/register',
  '/signup',
  FEEDBACK_PAGE_PATH,
];

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
  '/blog-posts',
  '/blog-preview',
  '/get-blog-posts',
  '/bulk-create-blog-posts',
  '/update-blog-posts',
];

const shouldSkipPath = (pathname = '') => {
  const path = String(pathname || '/');

  if (EXCLUDED_EXACT.includes(path)) return true;

  return EXCLUDED_PREFIXES.some((prefix) =>
    path.startsWith(prefix)
  );
};

const readActiveMs = () => {
  try {
    const n = Number(sessionStorage.getItem(ACTIVE_MS_KEY));

    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
};

const writeActiveMs = (value) => {
  try {
    sessionStorage.setItem(
      ACTIVE_MS_KEY,
      String(Math.max(0, Number(value) || 0))
    );
  } catch {
    // Ignore unavailable browser storage.
  }
};

const resetActiveMs = () => {
  try {
    sessionStorage.removeItem(ACTIVE_MS_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
};

const isRecentlySubmitted = () => {
  try {
    const timestamp = Number(
      localStorage.getItem(LAST_SUBMITTED_AT_KEY) || 0
    );

    if (!timestamp) return false;

    return Date.now() - timestamp < SUBMIT_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const isDismissedThisSession = () => {
  try {
    return (
      sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1'
    );
  } catch {
    return false;
  }
};

const markDismissedThisSession = () => {
  try {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
  } catch {
    // Ignore unavailable browser storage.
  }
};

const normalizeReturnPath = (value = '') => {
  const path = String(value || '').trim();

  if (!path) return '';
  if (!path.startsWith('/')) return '';
  if (path.startsWith('//')) return '';

  if (
    path === FEEDBACK_PAGE_PATH ||
    path.startsWith(`${FEEDBACK_PAGE_PATH}?`) ||
    path.startsWith(`${FEEDBACK_PAGE_PATH}#`) ||
    path.startsWith(`${FEEDBACK_PAGE_PATH}/`)
  ) {
    return '';
  }

  return path;
};

const storeCurrentPathForFeedbackReturn = () => {
  try {
    if (typeof window === 'undefined') return;

    const currentPath = normalizeReturnPath(
      `${window.location.pathname || '/'}${window.location.search || ''
      }${window.location.hash || ''}`
    );

    if (!currentPath) return;

    sessionStorage.setItem(
      RETURN_PATH_SESSION_KEY,
      currentPath
    );
  } catch {
    // Ignore unavailable browser storage.
  }
};

/**
 * Tracks visible and focused browsing time.
 *
 * After 15 active minutes by default, the user is sent to /feedback.
 * Set NEXT_PUBLIC_FEEDBACK_ACTIVE_MINUTES to change the delay.
 */
export default function WebsiteFeedbackPrompt({
  blocked = false,
  onOpenChange,
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const [mounted, setMounted] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    setMounted(true);
    onOpenChange?.(false);

    return () => {
      onOpenChange?.(false);
    };
  }, [onOpenChange]);

  useEffect(() => {
    if (!mounted) return;

    const user = getUserInfo();

    if (user?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;

    if (isRecentlySubmitted()) {
      resetActiveMs();
      return;
    }

    if (isDismissedThisSession()) return;

    if (readActiveMs() >= ACTIVE_TIME_TARGET_MS) {
      setEligible(true);
      return;
    }

    let lastTick = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTick);

      lastTick = now;

      if (document.visibilityState !== 'visible') {
        return;
      }

      if (
        typeof document.hasFocus === 'function' &&
        !document.hasFocus()
      ) {
        return;
      }

      const nextActiveMs = readActiveMs() + delta;
      writeActiveMs(nextActiveMs);

      if (nextActiveMs >= ACTIVE_TIME_TARGET_MS) {
        setEligible(true);
      }
    };

    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted || !eligible || blocked) return;

    const user = getUserInfo();

    if (user?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;
    if (isRecentlySubmitted()) return;
    if (isDismissedThisSession()) return;

    storeCurrentPathForFeedbackReturn();

    // Prevent a loop if the user closes the feedback page.
    markDismissedThisSession();

    router.push(FEEDBACK_PAGE_PATH);
  }, [mounted, eligible, blocked, pathname, router]);

  return null;
}
