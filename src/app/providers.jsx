// frontend-next/src/app/providers.jsx
'use client';

import { useEffect, useMemo } from 'react';
import DrawerContext from '../context/DrawerContext';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { getUserInfo } from '../lib/client/auth';
import { apiFetch } from '../lib/client/apiFetch';
import { ensurePushSubscription } from '../lib/client/pushNotifications';

import { getGoogleClientId, isValidGoogleClientId } from '../lib/client/googleClient';

const PENDING_KEY = 'pendingWatchRequest';

const shouldRegisterServiceWorker = () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  if (process.env.NODE_ENV === 'production') return true;

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

async function registerServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      existing.update().catch(() => {});
      return;
    }

    const reg = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    if (process.env.NODE_ENV === 'production') {
      const refresh = () => window.location.reload();
      navigator.serviceWorker.addEventListener('controllerchange', refresh);
    }

    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          nw.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    reg.update().catch(() => {});
  } catch (e) {
    console.warn('[sw] registration failed:', e);
  }
}

export default function Providers({ children }) {
  const googleClientId = getGoogleClientId();
  const googleEnabled = isValidGoogleClientId(googleClientId);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // keep existing behavior: auto-submit pending request + ensure push if granted
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncAfterAuth = async () => {
      const ui = getUserInfo();
      const token = ui?.token;
      if (!token) return;

      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
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

  // ✅ Only enable Google provider if the ID looks valid
  if (googleEnabled) {
    return (
      <GoogleOAuthProvider clientId={googleClientId} key={googleClientId}>
        {app}
      </GoogleOAuthProvider>
    );
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[google] Google login disabled: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing/invalid.'
    );
  }

  return app;
}
