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

const GA_SCRIPT_ID = 'flixmovo-ga4-script';

const GA_DEBUG_MODE =
  String(process.env.NEXT_PUBLIC_GA_DEBUG_MODE || '')
    .trim()
    .toLowerCase() === 'true';

const ALLOW_VERCEL_PREVIEW =
  String(process.env.NEXT_PUBLIC_GA_ALLOW_PREVIEW || '')
    .trim()
    .toLowerCase() === 'true';

const REAL_USER_ACTIVE_MS = Math.max(
  5000,
  Number(process.env.NEXT_PUBLIC_REAL_USER_ACTIVE_MS || 15000)
);

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

const PRIVATE_EXACT = new Set([
  '/profile',
  '/password',
  '/favorites',
  '/feedback',
]);

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
    hostnameFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
    hostnameFromUrl(process.env.NEXT_PUBLIC_ENGLISH_SITE_URL),
    hostnameFromUrl(process.env.NEXT_PUBLIC_HINDI_SITE_URL),
    'flixmovo.online',
    'www.flixmovo.online',
    'hi.flixmovo.online',
  ].filter(Boolean)
);

const shouldSkipPath = (pathname = '') => {
  const path = clean(pathname) || '/';

  if (PRIVATE_EXACT.has(path)) return true;

  return PRIVATE_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`)
  );
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

const isAllowedHost = () => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();

  if (
    hostname.endsWith('.vercel.app') &&
    !ALLOW_VERCEL_PREVIEW
  ) {
    return false;
  }

  return ALLOWED_HOSTS.has(hostname);
};

const isAutomationLikely = () =>
  typeof navigator !== 'undefined' &&
  navigator.webdriver === true;

const buildPagePath = (pathname, searchParams) => {
  const path = pathname || '/';
  const query = searchParams?.toString?.() || '';

  return query ? `${path}?${query}` : path;
};

const classifyPage = (pathname = '/') => {
  const path = clean(pathname) || '/';

  if (path === '/') {
    return {
      pageType: 'home',
      contentGroup: 'Home',
    };
  }

  if (path.startsWith('/movie/tmdb/')) {
    return {
      pageType: 'virtual_movie',
      contentGroup: 'Movies',
    };
  }

  if (path.startsWith('/movie/')) {
    return {
      pageType: 'movie_detail',
      contentGroup: 'Movies',
    };
  }

  if (path.startsWith('/watch/tmdb/')) {
    return {
      pageType: 'virtual_watch',
      contentGroup: 'Watch',
    };
  }

  if (path.startsWith('/watch/')) {
    return {
      pageType: 'watch',
      contentGroup: 'Watch',
    };
  }

  if (path.startsWith('/actor/')) {
    return {
      pageType: 'actor_profile',
      contentGroup: 'Actors',
    };
  }

  if (path === '/movies' || path.startsWith('/movies/')) {
    return {
      pageType: 'movie_listing',
      contentGroup: 'Movies',
    };
  }

  if (path === '/blog') {
    return {
      pageType: 'blog_home',
      contentGroup: 'Blog',
    };
  }

  if (path.startsWith('/blog/')) {
    const parts = path.split('/').filter(Boolean);

    return {
      pageType:
        parts.length >= 3
          ? 'blog_article'
          : 'blog_category',
      contentGroup: 'Blog',
    };
  }

  if (
    path === '/login' ||
    path === '/register' ||
    path === '/signup'
  ) {
    return {
      pageType: 'authentication',
      contentGroup: 'Account',
    };
  }

  return {
    pageType: 'other',
    contentGroup: 'Other',
  };
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

const configureGtag = () => {
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

const loadGaScript = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.__FLIXMOVO_GA_SCRIPT_PROMISE__) {
    return window.__FLIXMOVO_GA_SCRIPT_PROMISE__;
  }

  const promise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GA_SCRIPT_ID);

    if (existing?.dataset?.loaded === 'true') {
      resolve(true);
      return;
    }

    const onLoad = () => {
      const script = document.getElementById(GA_SCRIPT_ID);

      if (script) {
        script.dataset.loaded = 'true';
      }

      resolve(true);
    };

    const onError = () => {
      reject(new Error('Failed to load Google Analytics'));
    };

    if (existing) {
      existing.addEventListener('load', onLoad, {
        once: true,
      });

      existing.addEventListener('error', onError, {
        once: true,
      });

      return;
    }

    const script = document.createElement('script');

    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        GA_ID
      )}`;

    script.addEventListener('load', onLoad, {
      once: true,
    });

    script.addEventListener('error', onError, {
      once: true,
    });

    document.head.appendChild(script);
  }).catch((error) => {
    window.__FLIXMOVO_GA_SCRIPT_PROMISE__ = null;
    throw error;
  });

  window.__FLIXMOVO_GA_SCRIPT_PROMISE__ = promise;

  return promise;
};

function AnalyticsBootstrapInner() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();

  const pagePath = useMemo(
    () => buildPagePath(pathname, searchParams),
    [pathname, searchParams]
  );

  const readyRef = useRef(false);
  const bootPromiseRef = useRef(null);
  const latestPagePathRef = useRef(pagePath);

  const lastPageViewRef = useRef('');
  const lastContextEventRef = useRef('');

  const humanIntentRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const engagementSentRef = useRef(false);

  const pendingEventsRef = useRef([]);

  const canTrack = useCallback(() => {
    if (!GA_ID) return false;
    if (shouldSkipPath(pathname)) return false;
    if (!isAllowedHost()) return false;
    if (isAutomationLikely()) return false;
    if (getStoredUserRole() === 'admin') return false;

    return true;
  }, [pathname]);

  const sendRawEvent = useCallback((eventName, params = {}) => {
    if (!readyRef.current) return;
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', eventName, {
      ...params,
      ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
    });
  }, []);

  const applyUserProperties = useCallback(() => {
    if (!readyRef.current) return;
    if (typeof window.gtag !== 'function') return;

    const role = getStoredUserRole();

    window.gtag('set', 'user_properties', {
      user_role: role,
      logged_in: role === 'user' ? 'true' : 'false',
    });
  }, []);

  const sendPageView = useCallback(
    (requestedPath = '') => {
      if (!readyRef.current) return;

      const nextPath =
        clean(requestedPath) ||
        latestPagePathRef.current ||
        '/';

      if (lastPageViewRef.current === nextPath) return;

      const url = new URL(nextPath, window.location.origin);
      const classification = classifyPage(url.pathname);

      sendRawEvent('page_view', {
        page_path: nextPath,
        page_location: url.toString(),
        page_title: document.title,
        page_type: classification.pageType,
        content_group: classification.contentGroup,
        traffic_quality: humanIntentRef.current
          ? 'human_intent'
          : 'unknown',
      });

      lastPageViewRef.current = nextPath;
    },
    [sendRawEvent]
  );

  const sendContextEvents = useCallback(
    (requestedPath = '') => {
      if (!readyRef.current) return;

      const nextPath =
        clean(requestedPath) ||
        latestPagePathRef.current ||
        '/';

      if (lastContextEventRef.current === nextPath) return;

      lastContextEventRef.current = nextPath;

      const url = new URL(nextPath, window.location.origin);
      const path = url.pathname;

      const parts = path
        .split('/')
        .filter(Boolean)
        .map((part) => {
          try {
            return decodeURIComponent(part);
          } catch {
            return part;
          }
        });

      const searchTerm =
        clean(url.searchParams.get('search')) ||
        clean(url.searchParams.get('query')) ||
        clean(url.searchParams.get('q'));

      if (searchTerm) {
        sendRawEvent('view_search_results', {
          search_term: searchTerm.slice(0, 100),
          page_path: nextPath,
        });
      }

      if (path.startsWith('/movie/tmdb/')) {
        sendRawEvent('view_movie_detail', {
          movie_slug: parts.slice(1).join('/').slice(0, 150),
          content_source: 'tmdb_virtual',
          page_path: nextPath,
        });

        return;
      }

      if (path.startsWith('/movie/') && parts[1]) {
        sendRawEvent('view_movie_detail', {
          movie_slug: parts[1].slice(0, 150),
          content_source: 'local',
          page_path: nextPath,
        });

        return;
      }

      if (path.startsWith('/watch/') && parts[1]) {
        sendRawEvent('view_watch_page', {
          movie_slug: parts.slice(1).join('/').slice(0, 150),
          content_source: path.startsWith('/watch/tmdb/')
            ? 'tmdb_virtual'
            : 'local',
          page_path: nextPath,
        });

        return;
      }

      if (path.startsWith('/actor/') && parts[1]) {
        sendRawEvent('view_actor_profile', {
          actor_slug: parts[1].slice(0, 150),
          page_path: nextPath,
        });

        return;
      }

      if (path.startsWith('/blog/')) {
        if (parts.length >= 3) {
          sendRawEvent('view_blog_article', {
            blog_category: parts[1].slice(0, 100),
            article_slug: parts[2].slice(0, 150),
            page_path: nextPath,
          });
        } else if (parts.length === 2) {
          sendRawEvent('view_blog_category', {
            blog_category: parts[1].slice(0, 100),
            page_path: nextPath,
          });
        }
      }
    },
    [sendRawEvent]
  );

  const flushPendingEvents = useCallback(() => {
    if (!readyRef.current) return;

    const pending = pendingEventsRef.current;
    pendingEventsRef.current = [];

    pending.forEach(({ eventName, params }) => {
      sendRawEvent(eventName, params);
    });
  }, [sendRawEvent]);

  const bootAnalytics = useCallback(async () => {
    if (!canTrack()) return false;

    if (readyRef.current) {
      return true;
    }

    if (bootPromiseRef.current) {
      return bootPromiseRef.current;
    }

    bootPromiseRef.current = (async () => {
      configureGtag();
      await loadGaScript();

      readyRef.current = true;
      window.__FLIXMOVO_GA_READY__ = true;

      applyUserProperties();
      sendPageView(latestPagePathRef.current);
      sendContextEvents(latestPagePathRef.current);
      flushPendingEvents();

      return true;
    })().catch(() => {
      bootPromiseRef.current = null;
      return false;
    });

    return bootPromiseRef.current;
  }, [
    canTrack,
    applyUserProperties,
    sendPageView,
    sendContextEvents,
    flushPendingEvents,
  ]);

  const recordEvent = useCallback(
    (eventName, params = {}) => {
      if (!canTrack()) return;

      const name = clean(eventName).slice(0, 40);
      if (!name) return;

      const payload = {
        page_path: latestPagePathRef.current || '/',
        ...params,
      };

      if (readyRef.current) {
        sendRawEvent(name, payload);
      } else {
        pendingEventsRef.current = [
          ...pendingEventsRef.current.slice(-99),
          {
            eventName: name,
            params: payload,
          },
        ];
      }

      bootAnalytics().catch(() => { });
    },
    [canTrack, sendRawEvent, bootAnalytics]
  );

  // Initial load and App Router route changes.
  useEffect(() => {
    latestPagePathRef.current = pagePath;

    if (!canTrack()) return;

    bootAnalytics().then((ready) => {
      if (!ready) return;

      applyUserProperties();
      sendPageView(pagePath);
      sendContextEvents(pagePath);
    });
  }, [
    pagePath,
    canTrack,
    bootAnalytics,
    applyUserProperties,
    sendPageView,
    sendContextEvents,
  ]);

  // Mark genuine browser interaction.
  useEffect(() => {
    const markHumanIntent = () => {
      humanIntentRef.current = true;
    };

    window.addEventListener('pointerdown', markHumanIntent, {
      passive: true,
    });

    window.addEventListener('touchstart', markHumanIntent, {
      passive: true,
    });

    window.addEventListener('scroll', markHumanIntent, {
      passive: true,
    });

    window.addEventListener('keydown', markHumanIntent);

    return () => {
      window.removeEventListener('pointerdown', markHumanIntent);
      window.removeEventListener('touchstart', markHumanIntent);
      window.removeEventListener('scroll', markHumanIntent);
      window.removeEventListener('keydown', markHumanIntent);
    };
  }, []);

  // Global API used by login/register and other successful actions.
  useEffect(() => {
    window.flixmovoTrack = recordEvent;

    return () => {
      if (window.flixmovoTrack === recordEvent) {
        delete window.flixmovoTrack;
      }
    };
  }, [recordEvent]);

  // Useful automatic click-intent analytics.
  useEffect(() => {
    if (!canTrack()) return;

    const onClick = (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest('a,button')
          : null;

      if (!target) return;

      humanIntentRef.current = true;

      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || '';
        if (!href) return;

        let destination;

        try {
          destination = new URL(
            href,
            window.location.origin
          );
        } catch {
          return;
        }

        if (target.hasAttribute('download')) {
          recordEvent('download_intent', {
            link_url: destination.toString().slice(0, 500),
          });

          return;
        }

        if (destination.origin !== window.location.origin) {
          return;
        }

        if (destination.pathname.startsWith('/watch/')) {
          recordEvent('watch_intent', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/movie/')) {
          recordEvent('select_movie', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/actor/')) {
          recordEvent('select_actor', {
            destination_path:
              destination.pathname.slice(0, 250),
          });

          return;
        }

        if (destination.pathname.startsWith('/blog/')) {
          recordEvent('select_article', {
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

      const lower = label.toLowerCase();

      if (
        lower === 'play' ||
        lower.startsWith('play ') ||
        lower === 'watch'
      ) {
        recordEvent('watch_start', {
          control_label: label,
        });

        return;
      }

      if (/^server\s+\d+/i.test(label)) {
        recordEvent('server_select', {
          server_label: label,
        });

        return;
      }

      if (
        lower.startsWith('episode ') ||
        lower.startsWith('ep ')
      ) {
        recordEvent('episode_select', {
          episode_label: label,
        });
      }
    };

    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, [canTrack, recordEvent]);

  // Custom real-user active-time event.
  useEffect(() => {
    if (!canTrack()) return;

    lastTickRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(
        0,
        now - lastTickRef.current
      );

      lastTickRef.current = now;

      if (!humanIntentRef.current) return;
      if (document.visibilityState !== 'visible') return;

      if (
        typeof document.hasFocus === 'function' &&
        !document.hasFocus()
      ) {
        return;
      }

      activeMsRef.current += elapsed;

      if (
        activeMsRef.current >= REAL_USER_ACTIVE_MS &&
        !engagementSentRef.current
      ) {
        engagementSentRef.current = true;

        recordEvent('real_user_engaged', {
          engagement_gate_ms: REAL_USER_ACTIVE_MS,
          traffic_quality: 'human',
        });
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [canTrack, recordEvent]);

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
