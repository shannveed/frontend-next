import { apiFetch } from './apiFetch';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// ✅ avoid hammering subscribe endpoint
let inFlight = null;
let lastToken = null;
let lastOkAt = 0;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const getOrRegisterServiceWorker = async () => {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  let reg = await navigator.serviceWorker.getRegistration();
  if (reg) return reg;

  try {
    reg = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
};

export const isPushSupported = () => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) return false;
  return true;
};

export const ensurePushSubscription = async (token, { force = false } = {}) => {
  if (!token) return { supported: isPushSupported(), subscribed: false, reason: 'no_token' };
  if (!isPushSupported())
    return { supported: false, subscribed: false, reason: 'not_supported' };

  const now = Date.now();

  // ✅ cooldown for same user
  if (!force && lastToken === token && now - lastOkAt < COOLDOWN_MS) {
    return { supported: true, subscribed: true, permission: Notification.permission };
  }

  // ✅ single flight
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const reg = await getOrRegisterServiceWorker();
    if (!reg) return { supported: false, subscribed: false, reason: 'no_service_worker' };

    if (Notification.permission !== 'granted') {
      return { supported: true, subscribed: false, permission: Notification.permission };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await apiFetch('/api/push/subscribe', {
      method: 'POST',
      token,
      body: sub,
      cache: 'no-store'
    });

    lastToken = token;
    lastOkAt = Date.now();

    return { supported: true, subscribed: true, permission: Notification.permission };
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

export const requestPermissionAndSubscribe = async (token) => {
  if (!isPushSupported()) return { supported: false, subscribed: false, reason: 'not_supported' };

  if (Notification.permission === 'denied') {
    return { supported: true, subscribed: false, permission: 'denied' };
  }

  if (Notification.permission === 'granted') {
    return ensurePushSubscription(token);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { supported: true, subscribed: false, permission };
  }

  return ensurePushSubscription(token, { force: true });
};
