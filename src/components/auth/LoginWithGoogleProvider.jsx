// frontend-next/src/components/auth/LoginWithGoogleProvider.jsx
'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginClient from './LoginClient';
import {
  getGoogleClientId,
  getGoogleClientIdProblem,
} from '../../lib/client/googleOAuth';

export default function LoginWithGoogleProvider() {
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    const problem = getGoogleClientIdProblem();

    if (process.env.NODE_ENV !== 'production' && problem) {
      console.warn(`[google-oauth] ${problem}`);
    }

    return <LoginClient googleEnabled={false} googleConfigError={problem} />;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginClient googleEnabled />
    </GoogleOAuthProvider>
  );
}
