// frontend-next/src/components/layout/SiteChrome.jsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaTelegramPlane } from 'react-icons/fa';

import Footer from './Footer';
import NavBar from './NavBar';
import MobileFooter from './MobileFooter';

import MovieRequestPopup from '../modals/MovieRequestPopup';
import ChannelPopup from '../modals/ChannelPopup';
import InstallPwaPopup from '../modals/InstallPwaPopup';
import UpdateAvailablePopup from '../modals/UpdateAvailablePopup';

import RouteChangeTracker from '../analytics/RouteChangeTracker';
import AdsterraScripts from '../ads/AdsterraScripts';

import {
  OPEN_WATCH_REQUEST_POPUP,
  PUSH_RECEIVED_EVENT,
  SW_UPDATE_AVAILABLE_EVENT,
  SW_RELOAD_ON_CONTROLLERCHANGE_FLAG,
} from '../../lib/events';

import { getUserInfo } from '../../lib/client/auth';

const POPUP_COOLDOWN_MS = 20000;
const POPUP_RETRY_MS = 2000;

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.navigator?.standalone === true
  );
};

const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isIpadOS = /Macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;
  return isIOS || isIpadOS;
};

export default function SiteChrome({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || '';
  const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  const [userInfo, setUserInfoState] = useState(null);
  const isAdmin = !!userInfo?.isAdmin;

  const [requestOpen, setRequestOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  const isAnyPopupOpenRef = useRef(false);
  const lastPopupClosedAtRef = useRef(0);

  // ✅ NEW: update popup state
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const swRegRef = useRef(null);

  useEffect(() => setIsIOS(isIOSDevice()), []);

  useEffect(() => {
    setUserInfoState(getUserInfo());
    const onStorage = () => setUserInfoState(getUserInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    isAnyPopupOpenRef.current = requestOpen || telegramOpen || installOpen;
  }, [requestOpen, telegramOpen, installOpen]);

  const markPopupClosed = useCallback(() => {
    lastPopupClosedAtRef.current = Date.now();
  }, []);

  const canOpenPopupNow = useCallback(() => {
    const now = Date.now();
    const gapOk = now - lastPopupClosedAtRef.current >= POPUP_COOLDOWN_MS;
    return !isAnyPopupOpenRef.current && gapOk;
  }, []);

  const schedulePopup = useCallback(
    ({ storageKey, delayMs, open, shouldSkip }) => {
      let initialTimerId;
      let retryTimerId;
      let cancelled = false;

      const isShown = () => {
        try {
          return sessionStorage.getItem(storageKey) === '1';
        } catch {
          return false;
        }
      };

      const markShown = () => {
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch {}
      };

      const tryOpen = () => {
        if (cancelled) return;
        if (typeof shouldSkip === 'function' && shouldSkip()) return;
        if (isShown()) return;

        if (canOpenPopupNow()) {
          isAnyPopupOpenRef.current = true;
          open();
          markShown();
        } else {
          retryTimerId = window.setTimeout(tryOpen, POPUP_RETRY_MS);
        }
      };

      initialTimerId = window.setTimeout(tryOpen, delayMs);

      return () => {
        cancelled = true;
        if (initialTimerId) window.clearTimeout(initialTimerId);
        if (retryTimerId) window.clearTimeout(retryTimerId);
      };
    },
    [canOpenPopupNow]
  );

  useEffect(() => {
    router.prefetch('/movies');
    router.prefetch('/login');
    router.prefetch('/register');
  }, [router]);

  useEffect(() => {
    const handler = () => {
      setInstallOpen(false);
      setTelegramOpen(false);
      setRequestOpen(true);
    };
    window.addEventListener(OPEN_WATCH_REQUEST_POPUP, handler);
    return () => window.removeEventListener(OPEN_WATCH_REQUEST_POPUP, handler);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event) => {
      if (event?.data?.type === 'PUSH_RECEIVED') {
        window.dispatchEvent(new Event(PUSH_RECEIVED_EVENT));
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // ✅ NEW: listen for SW update available event (from Providers)
  useEffect(() => {
    const onUpdate = (evt) => {
      swRegRef.current = evt?.detail?.registration || null;
      setUpdateOpen(true);
    };

    window.addEventListener(SW_UPDATE_AVAILABLE_EVENT, onUpdate);
    return () => window.removeEventListener(SW_UPDATE_AVAILABLE_EVENT, onUpdate);
  }, []);

  const clearCaches = useCallback(async () => {
    try {
      if (!('caches' in window)) return;
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
  }, []);

  const handleUpdateNow = useCallback(async () => {
    if (updating) return;

    setUpdating(true);

    try {
      // optional but helps ensure fresh assets
      await clearCaches();

      if ('serviceWorker' in navigator) {
        const reg =
          swRegRef.current || (await navigator.serviceWorker.getRegistration('/'));

        if (reg?.waiting) {
          // ✅ tell Providers controllerchange listener to reload
          window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG] = true;

          // activate update
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });

          // fallback (in case controllerchange doesn't fire)
          window.setTimeout(() => window.location.reload(), 5000);
          return;
        }
      }

      // No SW waiting => just reload
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, [clearCaches, updating]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setInstallOpen(false);
      markPopupClosed();
      setDeferredPrompt(null);
      try {
        localStorage.setItem('pwaInstalled', '1');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [markPopupClosed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstallOpen(false);
      markPopupClosed();
    }
  };

  // Only show popup when install is possible OR iOS manual
  useEffect(() => {
    if (!isIOS && !deferredPrompt) return;

    const shouldSkip = () => {
      if (pathname === '/login' || pathname === '/register') return true;
      if (pathname.startsWith('/watch')) return true;
      if (isStandaloneMode()) return true;

      try {
        if (localStorage.getItem('pwaInstalled') === '1') return true;
      } catch {}

      if (!isIOS && !deferredPrompt) return true;
      return false;
    };

    return schedulePopup({
      storageKey: 'pwaInstallPopupShown',
      delayMs: 10000,
      open: () => setInstallOpen(true),
      shouldSkip,
    });
  }, [pathname, isIOS, deferredPrompt, schedulePopup]);

  useEffect(() => {
    if (!TELEGRAM_URL) return;

    const shouldSkip = () => {
      if (isAdmin) return true;
      if (pathname === '/login' || pathname === '/register') return true;
      if (pathname.startsWith('/watch')) return true;
      return false;
    };

    return schedulePopup({
      storageKey: 'telegramPopupShown',
      delayMs: 30000,
      open: () => setTelegramOpen(true),
      shouldSkip,
    });
  }, [pathname, TELEGRAM_URL, isAdmin, schedulePopup]);

  return (
    <div className="bg-main text-white" suppressHydrationWarning>
      {ADS_ENABLED ? <AdsterraScripts /> : null}
      <RouteChangeTracker />

      <NavBar />
      <div className="min-h-screen pb-20 sm:pb-0">{children}</div>

      <div className="mb-16 sm:mb-0">
        <Footer />
      </div>

      <MobileFooter />

      {/* ✅ NEW: Update popup */}
      <UpdateAvailablePopup
        open={updateOpen}
        updating={updating}
        onDismiss={() => {
          setUpdateOpen(false);
          setUpdating(false);
        }}
        onUpdate={handleUpdateNow}
      />

      <MovieRequestPopup
        open={requestOpen}
        onClose={() => {
          setRequestOpen(false);
          markPopupClosed();
        }}
      />

      <InstallPwaPopup
        open={installOpen}
        onClose={() => {
          setInstallOpen(false);
          markPopupClosed();
        }}
        onInstall={handleInstallClick}
        canInstall={!!deferredPrompt}
        isIOS={isIOS}
      />

      {TELEGRAM_URL && !isAdmin ? (
        <ChannelPopup
          open={telegramOpen}
          onClose={() => {
            setTelegramOpen(false);
            markPopupClosed();
          }}
          title="Join our Telegram Channel"
          description="Get instant updates, new uploads, and announcements."
          buttonText="Open Telegram"
          url={TELEGRAM_URL}
          Icon={FaTelegramPlane}
          showMaybeLater={false}
        />
      ) : null}
    </div>
  );
}
