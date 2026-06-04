// frontend-next/src/components/modals/WebsiteFeedbackPrompt.jsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getUserInfo } from '../../lib/client/auth';

const FEEDBACK_PAGE_PATH = '/feedback';

const ACTIVE_TIME_TARGET_MS = 5 * 60 * 1000; // 5 minutes
const SUBMIT_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

const ACTIVE_MS_KEY = 'mf_feedback_active_ms_v1';
const LAST_SUBMITTED_AT_KEY = 'mf_feedback_last_submitted_at_v1';
const DISMISSED_SESSION_KEY = 'mf_feedback_dismissed_this_session_v1';
const RETURN_PATH_SESSION_KEY = 'mf_feedback_return_path_v1';

const EXCLUDED_EXACT = ['/login', '/register', '/signup', FEEDBACK_PAGE_PATH];

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

  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const readNumber = (key, fallback = 0) => {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

const writeNumber = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const isRecentlySubmitted = () => {
  try {
    const ts = Number(localStorage.getItem(LAST_SUBMITTED_AT_KEY) || 0);
    if (!ts) return false;

    return Date.now() - ts < SUBMIT_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const isDismissedThisSession = () => {
  try {
    return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const markDismissedThisSession = () => {
  try {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
  } catch {
    // ignore
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
      `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''
      }`
    );

    if (!currentPath) return;

    sessionStorage.setItem(RETURN_PATH_SESSION_KEY, currentPath);
  } catch {
    // ignore
  }
};

/**
 * This component is now a silent route trigger:
 * - tracks active browsing time
 * - after 3 minutes redirects to /feedback
 * - stores the current page path, so feedback close button can return user back
 * - does not render a modal anymore
 */
export default function WebsiteFeedbackPrompt({ blocked = false, onOpenChange }) {
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

    const ui = getUserInfo();

    if (ui?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;
    if (isRecentlySubmitted()) return;
    if (isDismissedThisSession()) return;

    let lastTick = Date.now();

    const tick = () => {
      if (document.visibilityState !== 'visible') {
        lastTick = Date.now();
        return;
      }

      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        lastTick = Date.now();
        return;
      }

      const now = Date.now();
      const delta = Math.max(0, now - lastTick);
      lastTick = now;

      const next = readNumber(ACTIVE_MS_KEY, 0) + delta;
      writeNumber(ACTIVE_MS_KEY, next);

      if (next >= ACTIVE_TIME_TARGET_MS) {
        setEligible(true);
      }
    };

    tick();

    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted) return;
    if (!eligible) return;
    if (blocked) return;

    const ui = getUserInfo();

    if (ui?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;
    if (isRecentlySubmitted()) return;
    if (isDismissedThisSession()) return;

    // Store the page user was on before automatic redirect to /feedback.
    storeCurrentPathForFeedbackReturn();

    // Prevent instant redirect loops if user closes/back without submitting.
    markDismissedThisSession();

    router.push(FEEDBACK_PAGE_PATH);
  }, [mounted, eligible, blocked, pathname, router]);

  return null;
}
