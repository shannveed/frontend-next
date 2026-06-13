// frontend-next/src/components/analytics/AnalyticsBootstrap.jsx
'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SCRIPT_ID = 'mf-ga4-script';
const REAL_USER_ACTIVE_MS = Number(
  process.env.NEXT_PUBLIC_REAL_USER_ACTIVE_MS || 15000
);

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

const EXCLUDED_EXACT = [
  '/login',
  '/register',
  '/signup',
  '/profile',
  '/password',
  '/favorites',
  '/feedback',
];

const clean = (value = '') => String(value ?? '').trim();

const hostnameFromUrl = (value = '') => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const ALLOWED_HOSTS = new Set(
  [
    hostnameFromUrl(process.env.NEXT_PUBLIC_SITE_URL || ''),
    hostnameFromUrl(process.env.NEXT_PUBLIC_ENGLISH_SITE_URL || ''),
    hostnameFromUrl(process.env.NEXT_PUBLIC_HINDI_SITE_URL || ''),
    'www.moviefrost.com',
    'moviefrost.com',
    'hi.moviefrost.com',
  ]
    .map(clean)
    .filter(Boolean)
);

const isAllowedProductionHost = () => {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.toLowerCase();

  // Do not send GA from Vercel preview deployments.
  if (host.endsWith('.vercel.app')) return false;

  return ALLOWED_HOSTS.has(host);
};

const shouldSkipAnalyticsForPath = (pathname = '') => {
  const path = String(pathname || '').trim();
  if (!path) return false;

  if (EXCLUDED_EXACT.includes(path)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const buildPagePath = (pathname, searchParams) => {
  const qs = searchParams?.toString?.() || '';
  const path = pathname || '/';
  return qs ? `${path}?${qs}` : path;
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

    const handleError = () => reject(new Error('Failed to load Google Analytics'));

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

const isVisibleAndFocused = () => {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
  return true;
};

const isAutomationLikely = () => {
  if (typeof navigator === 'undefined') return false;
  return navigator.webdriver === true;
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

  const humanSignalRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  const realUserEventSentRef = useRef(false);
  const pendingRealUserEventRef = useRef(false);

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
      traffic_quality: humanSignalRef.current ? 'human_intent' : 'unknown',
    });

    lastSentPagePathRef.current = page;
  }, []);

  const sendRealUserEngaged = useCallback(() => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (!readyRef.current || typeof window.gtag !== 'function') return;
    if (realUserEventSentRef.current) return;

    realUserEventSentRef.current = true;
    pendingRealUserEventRef.current = false;

    window.gtag('event', 'real_user_engaged', {
      traffic_quality: 'human',
      engagement_gate_ms: REAL_USER_ACTIVE_MS,
      page_path: latestPagePathRef.current || '/',
      page_location: window.location.href,
      page_title: document.title,
    });
  }, []);

  const bootAnalytics = useCallback(async () => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (skipAnalytics) return;
    if (!isAllowedProductionHost()) return;
    if (isAutomationLikely()) return;
    if (readyRef.current || bootStartedRef.current) return;

    bootStartedRef.current = true;

    try {
      ensureGtagConfig(GA_ID);
      await ensureGaScriptLoaded(GA_ID);

      readyRef.current = true;

      sendPageView(latestPagePathRef.current);

      if (pendingRealUserEventRef.current) {
        sendRealUserEngaged();
      }
    } catch {
      bootStartedRef.current = false;
    }
  }, [skipAnalytics, sendPageView, sendRealUserEngaged]);

  // Human-intent gate: no idle timer, no 7s fallback.
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (skipAnalytics) return;
    if (!isAllowedProductionHost()) return;

    const markHumanIntent = () => {
      if (isAutomationLikely()) return;

      humanSignalRef.current = true;
      bootAnalytics().catch(() => { });
    };

    window.addEventListener('pointerdown', markHumanIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('touchstart', markHumanIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('scroll', markHumanIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', markHumanIntent, { once: true });

    return () => {
      window.removeEventListener('pointerdown', markHumanIntent);
      window.removeEventListener('touchstart', markHumanIntent);
      window.removeEventListener('scroll', markHumanIntent);
      window.removeEventListener('keydown', markHumanIntent);
    };
  }, [skipAnalytics, bootAnalytics]);

  // Active-time gate for cleaner real-user reporting.
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (skipAnalytics) return;
    if (!isAllowedProductionHost()) return;

    lastTickRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTickRef.current);
      lastTickRef.current = now;

      if (!humanSignalRef.current) return;
      if (!isVisibleAndFocused()) return;

      activeMsRef.current += delta;

      if (
        activeMsRef.current >= REAL_USER_ACTIVE_MS &&
        !realUserEventSentRef.current
      ) {
        pendingRealUserEventRef.current = true;

        if (!readyRef.current) {
          bootAnalytics().catch(() => { });
          return;
        }

        sendRealUserEngaged();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [skipAnalytics, bootAnalytics, sendRealUserEngaged]);

  // Route-change page_view only after GA has already been human-booted.
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
