// frontend-next/src/components/analytics/AnalyticsBootstrap.jsx
'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = String(process.env.NEXT_PUBLIC_GA_ID || '').trim();

const SCRIPT_ID = 'flixmovo-ga4-script';

const REAL_USER_ACTIVE_MS = Math.max(
  5000,
  Number(process.env.NEXT_PUBLIC_REAL_USER_ACTIVE_MS || 15000)
);

const GA_DEBUG_MODE =
  String(process.env.NEXT_PUBLIC_GA_DEBUG_MODE || '')
    .trim()
    .toLowerCase() === 'true';

const ALLOW_VERCEL_PREVIEW =
  String(process.env.NEXT_PUBLIC_GA_ALLOW_PREVIEW || '')
    .trim()
    .toLowerCase() === 'true';

const PRIVATE_PREFIXES = [
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

const PRIVATE_EXACT = [
  '/profile',
  '/password',
  '/favorites',
  '/feedback',
];

const clean = (value = '') => String(value ?? '').trim();

const safeDecode = (value = '') => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
};

const hostnameFromUrl = (value = '') => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const ALLOWED_HOSTS = new Set(
  [
    hostnameFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
    hostnameFromUrl(process.env.NEXT_PUBLIC_ENGLISH_SITE_URL),
    hostnameFromUrl(process.env.NEXT_PUBLIC_HINDI_SITE_URL),
    'www.flixmovo.online',
    'flixmovo.online',
    'hi.flixmovo.online',
  ].filter(Boolean)
);

const shouldSkipPath = (pathname = '') => {
  const path = clean(pathname) || '/';

  if (PRIVATE_EXACT.includes(path)) return true;

  return PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

const isAllowedHost = () => {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.toLowerCase();

  if (host.endsWith('.vercel.app') && !ALLOW_VERCEL_PREVIEW) {
    return false;
  }

  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return ALLOWED_HOSTS.has(host);
};

const isAutomationLikely = () => {
  if (typeof navigator === 'undefined') return false;
  return navigator.webdriver === true;
};

const getStoredUserRole = () => {
  if (typeof window === 'undefined') return 'guest';

  try {
    const raw = localStorage.getItem('userInfo');
    const user = raw ? JSON.parse(raw) : null;

    if (user?.isAdmin) return 'admin';
    if (user?.token) return 'user';

    return 'guest';
  } catch {
    return 'guest';
  }
};

const isAdminUser = () => getStoredUserRole() === 'admin';

const buildPagePath = (pathname, searchParams) => {
  const path = pathname || '/';
  const query = searchParams?.toString?.() || '';

  return query ? `${path}?${query}` : path;
};

const classifyPage = (pathname = '/') => {
  const path = clean(pathname) || '/';

  if (path === '/') {
    return { pageType: 'home', contentGroup: 'Home' };
  }

  if (path.startsWith('/movie/tmdb/')) {
    return { pageType: 'virtual_movie', contentGroup: 'Movies' };
  }

  if (path.startsWith('/movie/')) {
    return { pageType: 'movie_detail', contentGroup: 'Movies' };
  }

  if (path.startsWith('/watch/tmdb/')) {
    return { pageType: 'virtual_watch', contentGroup: 'Watch' };
  }

  if (path.startsWith('/watch/')) {
    return { pageType: 'watch', contentGroup: 'Watch' };
  }

  if (path.startsWith('/actor/')) {
    return { pageType: 'actor_profile', contentGroup: 'Actors' };
  }

  if (path === '/movies' || path.startsWith('/movies/')) {
    return { pageType: 'movie_listing', contentGroup: 'Movies' };
  }

  if (path === '/blog') {
    return { pageType: 'blog_home', contentGroup: 'Blog' };
  }

  if (path.startsWith('/blog/')) {
    const parts = path.split('/').filter(Boolean);

    return {
      pageType: parts.length >= 3 ? 'blog_article' : 'blog_category',
      contentGroup: 'Blog',
    };
  }

  if (path === '/login' || path === '/register' || path === '/signup') {
    return { pageType: 'authentication', contentGroup: 'Account' };
  }

  return { pageType: 'other', contentGroup: 'Other' };
};

const normalizeEventParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ''
    )
  );

const ensureGtagStub = () => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
};

const ensureGtagConfigured = () => {
  if (typeof window === 'undefined' || !GA_ID) return;

  ensureGtagStub();

  if (window.__FLIXMOVO_GA_CONFIGURED__ === GA_ID) {
    return;
  }

  window.gtag('js', new Date());

  window.gtag('config', GA_ID, {
    send_page_view: false,
    cookie_domain: 'auto',
    cookie_flags: 'SameSite=Lax;Secure',
    transport_type: 'beacon',
    ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
  });

  window.__FLIXMOVO_GA_CONFIGURED__ = GA_ID;
};

const ensureGaScriptLoaded = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is unavailable'));
  }

  if (!GA_ID) {
    return Promise.reject(new Error('GA4 measurement ID is missing'));
  }

  if (window.__FLIXMOVO_GA_SCRIPT_PROMISE__) {
    return window.__FLIXMOVO_GA_SCRIPT_PROMISE__;
  }

  const promise = new Promise((resolve, reject) => {
    const onLoad = () => {
      const script = document.getElementById(SCRIPT_ID);

      if (script) {
        script.dataset.loaded = 'true';
      }

      resolve();
    };

    const onError = () => {
      reject(new Error('Failed to load Google Analytics'));
    };

    const existing = document.getElementById(SCRIPT_ID);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    const script = document.createElement('script');

    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      GA_ID
    )}`;

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    document.head.appendChild(script);
  }).catch((error) => {
    window.__FLIXMOVO_GA_SCRIPT_PROMISE__ = null;
    throw error;
  });

  window.__FLIXMOVO_GA_SCRIPT_PROMISE__ = promise;

  return promise;
};

const isVisibleAndFocused = () => {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;

  if (
    typeof document.hasFocus === 'function' &&
    !document.hasFocus()
  ) {
    return false;
  }

  return true;
};

function AnalyticsBootstrapInner() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();

  const pagePath = useMemo(
    () => buildPagePath(pathname, searchParams),
    [pathname, searchParams]
  );

  const skipAnalytics = useMemo(
    () => shouldSkipPath(pathname),
    [pathname]
  );

  const latestPagePathRef = useRef(pagePath);
  const lastPageViewRef = useRef('');
  const lastContextEventRef = useRef('');

  const bootStartedRef = useRef(false);
  const readyRef = useRef(false);

  const humanSignalRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const engagedEventSentRef = useRef(false);

  const pendingEventsRef = useRef([]);

  useEffect(() => {
    latestPagePathRef.current = pagePath;
  }, [pagePath]);

  const canTrack = useCallback(() => {
    if (!GA_ID) return false;
    if (skipAnalytics) return false;
    if (!isAllowedHost()) return false;
    if (isAutomationLikely()) return false;
    if (isAdminUser()) return false;

    return true;
  }, [skipAnalytics]);

  const sendRawEvent = useCallback((eventName, params = {}) => {
    if (!readyRef.current) return;
    if (typeof window.gtag !== 'function') return;

    window.gtag(
      'event',
      eventName,
      normalizeEventParams({
        ...params,
        ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
      })
    );
  }, []);

  const trackEvent = useCallback(
    (eventName, params = {}) => {
      const name = clean(eventName).slice(0, 40);

      if (!name || !canTrack()) return;

      const payload = normalizeEventParams({
        page_path: latestPagePathRef.current || '/',
        ...params,
      });

      if (!readyRef.current) {
        pendingEventsRef.current = [
          ...pendingEventsRef.current.slice(-99),
          { eventName: name, params: payload },
        ];

        return;
      }

      sendRawEvent(name, payload);
    },
    [canTrack, sendRawEvent]
  );

  const flushPendingEvents = useCallback(() => {
    if (!readyRef.current) return;

    const pending = pendingEventsRef.current;
    pendingEventsRef.current = [];

    for (const item of pending) {
      sendRawEvent(item.eventName, item.params);
    }
  }, [sendRawEvent]);

  const applyUserProperties = useCallback(() => {
    if (!readyRef.current) return;
    if (typeof window.gtag !== 'function') return;

    const role = getStoredUserRole();

    window.gtag('set', 'user_properties', {
      user_role: role,
      logged_in: role === 'user' ? 'true' : 'false',
    });
  }, []);

  const sendPageView = useCallback((requestedPath = '') => {
    if (!readyRef.current) return;

    const nextPath =
      clean(requestedPath) ||
      latestPagePathRef.current ||
      '/';

    if (lastPageViewRef.current === nextPath) {
      return;
    }

    const url = new URL(nextPath, window.location.origin);
    const classification = classifyPage(url.pathname);

    sendRawEvent('page_view', {
      page_path: nextPath,
      page_location: window.location.href,
      page_title: document.title,
      page_type: classification.pageType,
      content_group: classification.contentGroup,
      traffic_quality: humanSignalRef.current
        ? 'human_intent'
        : 'unknown',
    });

    lastPageViewRef.current = nextPath;
  }, [sendRawEvent]);

  const sendRouteContextEvents = useCallback(
    (requestedPath = '') => {
      if (!readyRef.current) return;

      const nextPath =
        clean(requestedPath) ||
        latestPagePathRef.current ||
        '/';

      if (lastContextEventRef.current === nextPath) {
        return;
      }

      lastContextEventRef.current = nextPath;

      const url = new URL(nextPath, window.location.origin);
      const path = url.pathname;
      const parts = path.split('/').filter(Boolean).map(safeDecode);

      const searchTerm =
        clean(url.searchParams.get('search')) ||
        clean(url.searchParams.get('query')) ||
        clean(url.searchParams.get('q'));

      if (searchTerm) {
        trackEvent('view_search_results', {
          search_term: searchTerm.slice(0, 100),
        });
      }

      if (path.startsWith('/movie/tmdb/')) {
        trackEvent('view_movie_detail', {
          movie_slug: parts.slice(1).join('/').slice(0, 150),
          content_source: 'tmdb_virtual',
        });

        return;
      }

      if (path.startsWith('/movie/') && parts[1]) {
        trackEvent('view_movie_detail', {
          movie_slug: parts[1].slice(0, 150),
          content_source: 'local',
        });

        return;
      }

      if (path.startsWith('/watch/') && parts[1]) {
        trackEvent('view_watch_page', {
          movie_slug: parts.slice(1).join('/').slice(0, 150),
          content_source: path.startsWith('/watch/tmdb/')
            ? 'tmdb_virtual'
            : 'local',
        });

        return;
      }

      if (path.startsWith('/actor/') && parts[1]) {
        trackEvent('view_actor_profile', {
          actor_slug: parts[1].slice(0, 150),
        });

        return;
      }

      if (path.startsWith('/blog/')) {
        if (parts.length >= 3) {
          trackEvent('view_blog_article', {
            blog_category: parts[1].slice(0, 100),
            article_slug: parts[2].slice(0, 150),
          });
        } else if (parts.length === 2) {
          trackEvent('view_blog_category', {
            blog_category: parts[1].slice(0, 100),
          });
        }
      }
    },
    [trackEvent]
  );

  const bootAnalytics = useCallback(async () => {
    if (!canTrack()) return;
    if (readyRef.current || bootStartedRef.current) return;

    bootStartedRef.current = true;

    try {
      ensureGtagConfigured();
      await ensureGaScriptLoaded();

      readyRef.current = true;
      window.__FLIXMOVO_GA_READY__ = true;

      applyUserProperties();
      sendPageView(latestPagePathRef.current);
      sendRouteContextEvents(latestPagePathRef.current);
      flushPendingEvents();

      try {
        window.dispatchEvent(
          new CustomEvent('flixmovo-analytics-ready')
        );
      } catch {
        // Ignore old-browser event issues.
      }
    } catch {
      bootStartedRef.current = false;
    }
  }, [
    canTrack,
    applyUserProperties,
    sendPageView,
    sendRouteContextEvents,
    flushPendingEvents,
  ]);

  useEffect(() => {
    if (!canTrack()) return;

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

    window.addEventListener('keydown', markHumanIntent, {
      once: true,
    });

    return () => {
      window.removeEventListener('pointerdown', markHumanIntent);
      window.removeEventListener('touchstart', markHumanIntent);
      window.removeEventListener('scroll', markHumanIntent);
      window.removeEventListener('keydown', markHumanIntent);
    };
  }, [canTrack, bootAnalytics]);

  /**
   * Delegated click analytics. No user names, emails or other PII are sent.
   */
  useEffect(() => {
    if (!canTrack()) return;

    const onClick = (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest('a,button')
          : null;

      if (!target) return;

      humanSignalRef.current = true;
      bootAnalytics().catch(() => { });

      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || '';

        if (!href) return;

        let destination;

        try {
          destination = new URL(href, window.location.origin);
        } catch {
          return;
        }

        if (target.hasAttribute('download')) {
          trackEvent('download_intent', {
            link_url: destination.toString().slice(0, 500),
          });

          return;
        }

        if (destination.origin !== window.location.origin) {
          return;
        }

        if (destination.pathname.startsWith('/watch/')) {
          trackEvent('watch_intent', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/movie/')) {
          trackEvent('select_movie', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/actor/')) {
          trackEvent('select_actor', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/blog/')) {
          trackEvent('select_article', {
            destination_path:
              destination.pathname.slice(0, 250),
          });
        }

        return;
      }

      const label = clean(
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        target.textContent
      )
        .replace(/\s+/g, ' ')
        .slice(0, 100);

      const normalizedLabel = label.toLowerCase();

      if (
        normalizedLabel === 'play' ||
        normalizedLabel.startsWith('play ') ||
        normalizedLabel === 'watch'
      ) {
        trackEvent('watch_start', {
          control_label: label,
        });

        return;
      }

      if (/^server\s+\d+/i.test(label)) {
        trackEvent('server_select', {
          server_label: label,
        });

        return;
      }

      if (
        normalizedLabel.startsWith('episode ') ||
        normalizedLabel.startsWith('ep ')
      ) {
        trackEvent('episode_select', {
          episode_label: label,
        });
      }
    };

    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, [canTrack, bootAnalytics, trackEvent]);

  /**
   * Public API for explicit successful events:
   *
   * window.flixmovoTrack('login', { method: 'google' });
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tracker = (eventName, params = {}) => {
      humanSignalRef.current = true;
      bootAnalytics().catch(() => { });
      trackEvent(eventName, params);
    };

    window.flixmovoTrack = tracker;

    return () => {
      if (window.flixmovoTrack === tracker) {
        delete window.flixmovoTrack;
      }
    };
  }, [bootAnalytics, trackEvent]);

  useEffect(() => {
    if (!canTrack()) return;

    lastTickRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, now - lastTickRef.current);

      lastTickRef.current = now;

      if (!humanSignalRef.current) return;
      if (!isVisibleAndFocused()) return;

      activeMsRef.current += elapsed;

      if (
        activeMsRef.current >= REAL_USER_ACTIVE_MS &&
        !engagedEventSentRef.current
      ) {
        engagedEventSentRef.current = true;

        bootAnalytics()
          .then(() => {
            trackEvent('real_user_engaged', {
              engagement_gate_ms: REAL_USER_ACTIVE_MS,
              traffic_quality: 'human',
            });
          })
          .catch(() => { });
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [canTrack, bootAnalytics, trackEvent]);

  useEffect(() => {
    latestPagePathRef.current = pagePath;

    if (!readyRef.current || !canTrack()) return;

    sendPageView(pagePath);
    sendRouteContextEvents(pagePath);
  }, [
    pagePath,
    canTrack,
    sendPageView,
    sendRouteContextEvents,
  ]);

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
