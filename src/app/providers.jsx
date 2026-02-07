// frontend-next/src/app/providers.jsx
'use client';

import { useEffect, useMemo } from 'react';
import DrawerContext from '../context/DrawerContext';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { getUserInfo } from '../lib/client/auth';
import { apiFetch } from '../lib/client/apiFetch';
import { ensurePushSubscription } from '../lib/client/pushNotifications';

import {
  SW_UPDATE_AVAILABLE_EVENT,
  SW_RELOAD_ON_CONTROLLERCHANGE_FLAG,
} from '../lib/events';

const PENDING_KEY = 'pendingWatchRequest';

const shouldRegisterServiceWorker = () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  if (process.env.NODE_ENV === 'production') return true;

  // ✅ allow localhost testing of install prompt
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const dispatchSwUpdateAvailable = (registration) => {
  try {
    window.dispatchEvent(
      new CustomEvent(SW_UPDATE_AVAILABLE_EVENT, {
        detail: { registration },
      })
    );
  } catch {
    // ignore
  }
};

async function initServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  // ✅ Guard against React StrictMode double-effects
  if (window.__MF_SW_INIT__) return;
  window.__MF_SW_INIT__ = true;

  try {
    // Get existing reg or register
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    }

    // ✅ Reload ONLY when user requested update
    if (!window.__MF_SW_CONTROLLERCHANGE_BOUND__) {
      window.__MF_SW_CONTROLLERCHANGE_BOUND__ = true;

      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        if (!window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG]) return;

        window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG] = false;
        reloading = true;
        window.location.reload();
      });
    }

    // ✅ If update is already waiting, notify UI
    if (reg.waiting && navigator.serviceWorker.controller) {
      dispatchSwUpdateAvailable(reg);
    }

    // ✅ Listen for new updates
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // installed + controller exists => update available
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          dispatchSwUpdateAvailable(reg);
        }
      });
    });

    // ✅ Proactive update checks (so old tabs detect new deployments)
    const update = () => reg.update().catch(() => {});
    update();

    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onFocus = () => update();
    window.addEventListener('focus', onFocus);

    // Every 10 minutes check SW update
    window.setInterval(update, 10 * 60 * 1000);
  } catch (e) {
    console.warn('[sw] init failed:', e);
  }
}

export default function Providers({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    initServiceWorker();
  }, []);

  // ✅ Keep existing behavior: auto-submit pending request + ensure push if granted
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncAfterAuth = async () => {
      const ui = getUserInfo();
      const token = ui?.token;
      if (!token) return;

      try {
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          await ensurePushSubscription(token);
        }
      } catch {}

      let raw = null;
      try {
        raw = localStorage.getItem(PENDING_KEY);
      } catch {
        raw = null;
      }

      if (!raw) return;

      try {
        const pending = JSON.parse(raw);
        const title = String(pending?.title || '').trim();
        if (!title) return;

        await apiFetch('/api/requests', {
          method: 'POST',
          token,
          body: { title },
        });
      } catch (e) {
        console.warn('[watch-request] auto submit failed:', e?.message || e);
      } finally {
        try {
          localStorage.removeItem(PENDING_KEY);
        } catch {}
      }
    };

    syncAfterAuth().catch(() => {});
    window.addEventListener('storage', syncAfterAuth);

    return () => window.removeEventListener('storage', syncAfterAuth);
  }, []);

  const app = useMemo(() => {
    return (
      <DrawerContext>
        {children}
        <Toaster position="top-center" />
      </DrawerContext>
    );
  }, [children]);

  if (googleClientId && googleClientId !== 'undefined') {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    );
  }

  return app;
}
