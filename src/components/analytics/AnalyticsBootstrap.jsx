'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SCRIPT_ID = 'mf-ga4-script';
const IDLE_BOOT_TIMEOUT_MS = 3500;
const FALLBACK_BOOT_TIMEOUT_MS = 7000;

// Skip GA on private / admin / noindex-style pages
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
  '/profile',
  '/password',
  '/favorites',
];

const buildPagePath = (pathname, searchParams) => {
  const qs = searchParams?.toString?.() || '';
  const path = pathname || '/';
  return qs ? `${path}?${qs}` : path;
};

const shouldSkipAnalyticsForPath = (pathname = '') => {
  const path = String(pathname || '').trim();
  if (!path) return false;

  if (EXCLUDED_EXACT.includes(path)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const ensureGtagStub = () => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
};

const ensureGtagConfig = (gaId) => {
  if (typeof window === 'undefined' || !gaId) return;

  ensureGtagStub();

  if (window.__MF_GA4_CONFIGURED__ === gaId) return;

  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    send_page_view: false,
    anonymize_ip: true,
    transport_type: 'beacon',
  });

  window.__MF_GA4_CONFIGURED__ = gaId;
};

const ensureGaScriptLoaded = (gaId) => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window unavailable'));
  }

  if (!gaId) {
    return Promise.reject(new Error('GA id missing'));
  }

  if (window.__MF_GA4_SCRIPT_PROMISE__) {
    return window.__MF_GA4_SCRIPT_PROMISE__;
  }

  const promise = new Promise((resolve, reject) => {
    const handleLoad = () => {
      const node = document.getElementById(SCRIPT_ID);
      if (node) node.dataset.loaded = 'true';
      resolve();
    };

    const handleError = () => {
      reject(new Error('Failed to load Google Analytics'));
    };

    const existing = document.getElementById(SCRIPT_ID);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      gaId
    )}`;
    script.onload = handleLoad;
    script.onerror = handleError;

    document.head.appendChild(script);
  }).catch((error) => {
    window.__MF_GA4_SCRIPT_PROMISE__ = null;
    throw error;
  });

  window.__MF_GA4_SCRIPT_PROMISE__ = promise;
  return promise;
};

function AnalyticsBootstrapInner() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();

  const pagePath = useMemo(
    () => buildPagePath(pathname, searchParams),
    [pathname, searchParams]
  );

  const skipAnalytics = useMemo(
    () => shouldSkipAnalyticsForPath(pathname),
    [pathname]
  );

  const latestPagePathRef = useRef(pagePath);
  const lastSentPagePathRef = useRef('');
  const bootStartedRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    latestPagePathRef.current = pagePath;
  }, [pagePath]);

  const sendPageView = useCallback((nextPath) => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (!readyRef.current || typeof window.gtag !== 'function') return;

    const page = String(nextPath || latestPagePathRef.current || '').trim();
    if (!page) return;
    if (lastSentPagePathRef.current === page) return;

    window.gtag('event', 'page_view', {
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    });

    lastSentPagePathRef.current = page;
  }, []);

  const bootAnalytics = useCallback(async () => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (skipAnalytics || readyRef.current || bootStartedRef.current) return;

    bootStartedRef.current = true;

    try {
      ensureGtagConfig(GA_ID);
      await ensureGaScriptLoaded(GA_ID);

      readyRef.current = true;
      sendPageView(latestPagePathRef.current);
    } catch {
      bootStartedRef.current = false;
    }
  }, [skipAnalytics, sendPageView]);

  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (skipAnalytics || readyRef.current || bootStartedRef.current) return;

    let cancelled = false;
    let fallbackTimer = null;
    let idleId = null;

    const start = () => {
      if (cancelled) return;
      bootAnalytics().catch(() => { });
    };

    const onUserIntent = () => start();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') start();
    };

    window.addEventListener('pointerdown', onUserIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('touchstart', onUserIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('scroll', onUserIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', onUserIntent, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(start, {
        timeout: IDLE_BOOT_TIMEOUT_MS,
      });
    }

    fallbackTimer = window.setTimeout(start, FALLBACK_BOOT_TIMEOUT_MS);

    return () => {
      cancelled = true;

      window.removeEventListener('pointerdown', onUserIntent);
      window.removeEventListener('touchstart', onUserIntent);
      window.removeEventListener('scroll', onUserIntent);
      window.removeEventListener('keydown', onUserIntent);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (fallbackTimer) window.clearTimeout(fallbackTimer);

      if (
        idleId !== null &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [skipAnalytics, bootAnalytics]);

  useEffect(() => {
    if (!GA_ID || skipAnalytics) return;
    if (!readyRef.current) return;

    sendPageView(pagePath);
  }, [pagePath, skipAnalytics, sendPageView]);

  return null;
}

export default function AnalyticsBootstrap() {
  if (!GA_ID) return null;
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <Suspense fallback={null}>
      <AnalyticsBootstrapInner />
    </Suspense>
  );
}
