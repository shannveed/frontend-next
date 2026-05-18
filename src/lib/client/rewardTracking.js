// frontend-next/src/lib/client/rewardTracking.js
const REFERRAL_KEY = 'mf_referral_code';
const DEVICE_ID_KEY = 'mf_reward_device_id';
const REWARD_CACHE_KEY = 'mf_reward_ad_free_until';

const clean = (value = '') => String(value ?? '').trim();

const normalizeReferralCode = (value = '') =>
  clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 64);

const makeFallbackDeviceId = () => {
  const existing =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `fallback:${existing}`;
};

export const storeReferralCode = (code) => {
  if (typeof window === 'undefined') return '';

  const safe = normalizeReferralCode(code);
  if (!safe) return '';

  try {
    localStorage.setItem(REFERRAL_KEY, safe);
  } catch {
    // ignore
  }

  return safe;
};

export const getStoredReferralCode = () => {
  if (typeof window === 'undefined') return '';

  try {
    return normalizeReferralCode(localStorage.getItem(REFERRAL_KEY) || '');
  } catch {
    return '';
  }
};

export const clearStoredReferralCode = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REFERRAL_KEY);
  } catch {
    // ignore
  }
};

export const captureReferralFromLocation = () => {
  if (typeof window === 'undefined') return '';

  try {
    const url = new URL(window.location.href);
    const ref = normalizeReferralCode(url.searchParams.get('ref') || '');

    if (ref) storeReferralCode(ref);

    return ref;
  } catch {
    return '';
  }
};

export const getReferralDeviceId = async () => {
  if (typeof window === 'undefined') return '';

  try {
    const cached = clean(localStorage.getItem(DEVICE_ID_KEY) || '');
    if (cached) return cached;
  } catch {
    // ignore
  }

  let deviceId = '';

  try {
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    deviceId = result?.visitorId ? `fp:${result.visitorId}` : '';
  } catch {
    deviceId = makeFallbackDeviceId();
  }

  if (!deviceId) deviceId = makeFallbackDeviceId();

  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch {
    // ignore
  }

  return deviceId;
};

export const setCachedRewardFromSummary = (summary) => {
  if (typeof window === 'undefined') return;

  const until = clean(summary?.adFreeUntil || '');

  try {
    if (until) localStorage.setItem(REWARD_CACHE_KEY, until);
    else localStorage.removeItem(REWARD_CACHE_KEY);
  } catch {
    // ignore
  }
};

export const isCachedRewardAdFreeActive = () => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = clean(localStorage.getItem(REWARD_CACHE_KEY) || '');
    if (!raw) return false;

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;

    return d.getTime() > Date.now();
  } catch {
    return false;
  }
};
