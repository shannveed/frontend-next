'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginClient from './LoginClient';

export default function LoginWithGoogleProvider() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (googleClientId && googleClientId !== 'undefined') {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <LoginClient />
      </GoogleOAuthProvider>
    );
  }

  return <LoginClient />;
}
