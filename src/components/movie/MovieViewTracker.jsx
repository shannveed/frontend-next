// frontend-next/src/components/movie/MovieViewTracker.jsx
'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_MIN_ACTIVE_MS = 15000;
const SESSION_KEY_PREFIX = 'mf_movie_view_tracked_v1:';

const isVisibleAndFocused = () => {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
  return true;
};

const alreadyTrackedThisSession = (key) => {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const markTrackedThisSession = (key) => {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore
  }
};

export default function MovieViewTracker({
  movieIdOrSlug,
  source = 'movie-page',
  minActiveMs = DEFAULT_MIN_ACTIVE_MS,
}) {
  const sentRef = useRef(false);
  const humanRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    const idOrSlug = String(movieIdOrSlug || '').trim();
    if (!idOrSlug) return;

    const storageKey = `${SESSION_KEY_PREFIX}${idOrSlug}`;
    if (alreadyTrackedThisSession(storageKey)) return;

    sentRef.current = false;
    humanRef.current = false;
    activeMsRef.current = 0;
    lastTickRef.current = Date.now();

    const markHuman = () => {
      humanRef.current = true;
    };

    const sendView = () => {
      if (sentRef.current) return;
      if (!humanRef.current) return;
      if (activeMsRef.current < minActiveMs) return;

      sentRef.current = true;
      markTrackedThisSession(storageKey);

      const safe = encodeURIComponent(idOrSlug);

      fetch(`/api/movies/${safe}/view`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(() => { });
    };

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTickRef.current);
      lastTickRef.current = now;

      if (!humanRef.current) return;
      if (!isVisibleAndFocused()) return;

      activeMsRef.current += delta;
      sendView();
    }, 1000);

    window.addEventListener('pointerdown', markHuman, { passive: true });
    window.addEventListener('touchstart', markHuman, { passive: true });
    window.addEventListener('keydown', markHuman);
    window.addEventListener('scroll', markHuman, { passive: true });

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener('pointerdown', markHuman);
      window.removeEventListener('touchstart', markHuman);
      window.removeEventListener('keydown', markHuman);
      window.removeEventListener('scroll', markHuman);
    };
  }, [movieIdOrSlug, source, minActiveMs]);

  return null;
}
