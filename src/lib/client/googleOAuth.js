// frontend-next/src/lib/client/googleOAuth.js

const GOOGLE_CLIENT_ID_RE =
  /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;

const EMPTY_VALUES = new Set([
  '',
  'undefined',
  'null',
  'your_google_client_id',
  'your_full_google_web_client_id.apps.googleusercontent.com',
]);

export const normalizeGoogleClientId = (
  value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
) => {
  const id = String(value || '').trim();

  if (EMPTY_VALUES.has(id.toLowerCase())) return '';

  return id;
};

export const isValidGoogleClientId = (
  value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
) => {
  const id = normalizeGoogleClientId(value);
  return GOOGLE_CLIENT_ID_RE.test(id);
};

export const getGoogleClientId = () => {
  const id = normalizeGoogleClientId();
  return isValidGoogleClientId(id) ? id : '';
};

export const getGoogleClientIdProblem = (
  value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
) => {
  const id = normalizeGoogleClientId(value);

  if (!id) {
    return 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.';
  }

  if (!GOOGLE_CLIENT_ID_RE.test(id)) {
    return 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is invalid. It must be a full Web Client ID ending with .apps.googleusercontent.com';
  }

  return '';
};
