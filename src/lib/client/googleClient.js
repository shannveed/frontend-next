// frontend-next/src/lib/client/googleClient.js

export const sanitizeGoogleClientId = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  // remove accidental surrounding quotes from Vercel env (very common)
  return raw.trim().replace(/^['"]|['"]$/g, '');
};

export const getGoogleClientId = () =>
  sanitizeGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export const isValidGoogleClientId = (value) => {
  const v = sanitizeGoogleClientId(value);
  // typical Google OAuth client id format
  return /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(v);
};
