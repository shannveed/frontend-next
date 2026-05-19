'use client';

import { useEffect } from 'react';
import { getUserInfo } from '../lib/client/auth';
import { apiFetch } from '../lib/client/apiFetch';
import { ensurePushSubscription } from '../lib/client/pushNotifications';
import {
  SW_RELOAD_ON_CONTROLLERCHANGE_FLAG,
  SW_UPDATE_AVAILABLE_EVENT,
} from '../lib/events';

const PENDING_KEY = 'pendingWatchRequest';
const SW_UPDATE_INTERVAL_MS = 10 * 60 * 1000;

const canUseWindow = () => typeof window !== 'undefined';

const canUseServiceWorker = () =>
  canUseWindow() && 'serviceWorker' in navigator;

const isProduction = () => process.env.NODE_ENV === 'production';

const shouldRegisterServiceWorker = () =>
  canUseServiceWorker() && isProduction();

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

const clearBrowserCaches = async () => {
  if (!canUseWindow() || !('caches' in window)) return;

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // ignore
  }
};

const cleanupDevServiceWorkers = async () => {
  if (!canUseServiceWorker()) return;

  try {
    const regs =
      typeof navigator.serviceWorker.getRegistrations === 'function'
        ? await navigator.serviceWorker.getRegistrations()
        : [];

    await Promise.all(
      (regs || []).map((reg) => reg.unregister().catch(() => false))
    );
  } catch {
    // ignore
  }

  await clearBrowserCaches();

  try {
    delete window.__MF_SW_INIT__;
    delete window.__MF_SW_CONTROLLERCHANGE_BOUND__;
    window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG] = false;
  } catch {
    // ignore
  }
};

async function initServiceWorker() {
  if (!shouldRegisterServiceWorker()) return () => { };
  if (window.__MF_SW_INIT__) return () => { };

  window.__MF_SW_INIT__ = true;

  let reg = null;
  let intervalId = null;
  const cleanupFns = [];

  const cleanup = () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });

    cleanupFns.length = 0;

    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    window.__MF_SW_INIT__ = false;
  };

  try {
    reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    }

    if (!window.__MF_SW_CONTROLLERCHANGE_BOUND__) {
      window.__MF_SW_CONTROLLERCHANGE_BOUND__ = true;

      let reloading = false;

      const onControllerChange = () => {
        if (reloading) return;
        if (!window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG]) return;

        window[SW_RELOAD_ON_CONTROLLERCHANGE_FLAG] = false;
        reloading = true;
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        onControllerChange
      );
      // keep global listener for app lifetime
    }

    if (reg.waiting && navigator.serviceWorker.controller) {
      dispatchSwUpdateAvailable(reg);
    }

    const onUpdateFound = () => {
      const newWorker = reg?.installing;
      if (!newWorker) return;

      const onStateChange = () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          dispatchSwUpdateAvailable(reg);
        }
      };

      newWorker.addEventListener('statechange', onStateChange);

      cleanupFns.push(() => {
        try {
          newWorker.removeEventListener('statechange', onStateChange);
        } catch {
          // ignore
        }
      });
    };

    reg.addEventListener('updatefound', onUpdateFound);

    cleanupFns.push(() => {
      try {
        reg?.removeEventListener('updatefound', onUpdateFound);
      } catch {
        // ignore
      }
    });

    const update = () => reg?.update().catch(() => { });

    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };

    const onFocus = () => update();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisible));
    cleanupFns.push(() => window.removeEventListener('focus', onFocus));

    update();
    intervalId = window.setInterval(update, SW_UPDATE_INTERVAL_MS);

    return cleanup;
  } catch (e) {
    console.warn('[sw] init failed:', e);
    cleanup();
    return () => { };
  }
}

export default function ProvidersRuntime() {
  useEffect(() => {
    let disposed = false;
    let cleanup = () => { };

    (async () => {
      if (!shouldRegisterServiceWorker()) {
        await cleanupDevServiceWorkers();
        return;
      }

      const nextCleanup = await initServiceWorker();

      if (disposed) {
        nextCleanup?.();
        return;
      }

      cleanup = typeof nextCleanup === 'function' ? nextCleanup : () => { };
    })().catch(() => { });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!canUseWindow()) return;

    let disposed = false;

    const syncAfterAuth = async () => {
      if (disposed) return;

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
      } catch {
        // ignore
      }

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
        } catch {
          // ignore
        }
      }
    };

    const onStorage = () => {
      syncAfterAuth().catch(() => { });
    };

    syncAfterAuth().catch(() => { });
    window.addEventListener('storage', onStorage);

    return () => {
      disposed = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
