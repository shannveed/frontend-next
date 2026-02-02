// src/components/auth/LoginClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { FiLogIn } from 'react-icons/fi';

import { apiFetch } from '../../lib/client/apiFetch';
import { getUserInfo, setUserInfo } from '../../lib/client/auth';

import { Input } from '../forms/Usedinputs';
import InlineError from '../forms/InlineError';

// ✅ 1:1 ad component (same as Watch page)
import { EffectiveGateSquareAd } from '../ads/EffectiveGateNativeBanner';

const GOOGLE_ENABLED =
  !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'undefined';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function redirectAfterAuth(router, user) {
  // Admin always goes to dashboard (same as your CRA behavior)
  if (user?.isAdmin) {
    router.replace('/dashboard');
    return;
  }

  // Normal user: honor redirectAfterLogin if present
  try {
    const raw = localStorage.getItem('redirectAfterLogin');
    if (raw) {
      const st = JSON.parse(raw);
      localStorage.removeItem('redirectAfterLogin');

      const fullPath = `${st?.pathname || '/profile'}${st?.search || ''}${st?.hash || ''}`;
      router.replace(fullPath);

      // restore scroll (best effort)
      setTimeout(() => {
        if (typeof st?.scrollY === 'number' && st.scrollY > 0) {
          window.scrollTo(0, st.scrollY);
        }
      }, 150);

      return;
    }
  } catch {}

  router.replace('/profile');
}

export default function LoginClient() {
  const router = useRouter();

  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // CRA-like: only show Google button if configured
  useEffect(() => {
    setGoogleAuthEnabled(GOOGLE_ENABLED);
  }, []);

  // If already logged in, redirect away
  useEffect(() => {
    const ui = getUserInfo();
    if (ui?.token) redirectAfterAuth(router, ui);
  }, [router]);

  const validate = () => {
    const errs = {};
    const em = email.trim();

    if (!em) errs.email = 'Email is required';
    else if (!isValidEmail(em)) errs.email = 'Please enter a valid email';

    if (!password) errs.password = 'Password is required';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canSubmit = useMemo(() => {
    return !loading;
  }, [loading]);

  const submitEmailPassword = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const data = await apiFetch('/api/users/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });

      setUserInfo(data);
      toast.success(`Welcome back ${data?.fullName || ''}`.trim());

      redirectAfterAuth(router, data);
    } catch (err) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async (accessToken) => {
    try {
      setLoading(true);

      const data = await apiFetch('/api/users/google-login', {
        method: 'POST',
        body: { accessToken },
      });

      setUserInfo(data);
      toast.success(`Welcome back ${data?.fullName || ''}`.trim());

      redirectAfterAuth(router, data);
    } catch (err) {
      toast.error(err?.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  // Google popup login (no redirect)
  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    ux_mode: 'popup',
    scope: 'openid profile email',
    prompt: 'select_account',
    onSuccess: (tokenResponse) => {
      const accessToken = tokenResponse?.access_token;
      if (!accessToken) {
        toast.error('Google returned no access token');
        return;
      }
      submitGoogle(accessToken);
    },
    onError: (err) => {
      console.error('Google Sign-In error:', err);
      toast.error(err?.error_description || 'Google Sign-In failed');
    },
  });

  const handleGoogleSignIn = () => {
    if (!googleAuthEnabled) {
      toast.error('Google Sign-In is not available at the moment');
      return;
    }
    if (loading) return;
    googleLogin();
  };

  return (
    <div className="container mx-auto px-2 flex-colo min-h-auto md:min-h-[calc(100vh-200px)] py-3">
      {/* ✅ Layout: Ads left + form + ads right (desktop only) */}
      <div className="w-full flex flex-col items-center lg:flex-row lg:justify-center lg:items-center lg:gap-4 xl:gap-8">
        {/* LEFT 1:1 AD — desktop only */}
        {ADS_ENABLED ? (
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <EffectiveGateSquareAd
              refreshKey="login-left"
              minWidthPx={1024}
              maxWidthPx={99999}
              minHeight={260}
              aspectRatio="1 / 1"
              className="my-0"
            />
          </div>
        ) : null}

        {/* LOGIN FORM */}
        <form
          onSubmit={submitEmailPassword}
          className="w-full md:w-3/5 2xl:w-2/5 above-1000:w-[450px] above-1000:max-w-[450px] flex flex-col gap-2 above-1000:gap-1 p-3 sm:p-8 above-1000:p-10 bg-dry rounded-lg border border-border shadow-xl"
        >
          <img
            src="/images/MOVIEFROST.png"
            alt="logo"
            className="w-full h-10 above-1000:h-10 object-contain mb-1"
          />

          {/* The extra line requested */}
          <div className="text-center mb-3 mt-1 text-sm font-semibold text-customPurple">
            Please Log In right now for Free
          </div>

          {/* Google button */}
          {googleAuthEnabled && (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={handleGoogleSignIn}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleGoogleSignIn();
                }}
                className="flex items-center justify-center bg-customPurple rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out w-full hover:shadow-lg mb-3 above-1000:mb-3"
              >
                <div className="py-2 px-4 flex items-center justify-center">
                  <img
                    className="w-8 h-8 above-1000:w-6 above-1000:h-6"
                    src="/images/google.png"
                    alt="Google Logo"
                  />
                </div>
                <p className="text-white font-semibold text-lg above-1000:text-base px-6">
                  Sign In with Google
                </p>
              </div>

              <div className="flex items-center gap-4 my-1 above-1000:my-1">
                <div className="flex-grow h-px bg-border" />
                <span className="text-border text-sm">OR</span>
                <div className="flex-grow h-px bg-border" />
              </div>
            </>
          )}

          {/* Email */}
          <div className="w-full flex flex-col gap-1">
            <Input
              label="Email"
              placeholder="Your Email"
              type="email"
              name="email"
              bg={true}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              autoComplete="email"
            />
            {fieldErrors.email ? <InlineError text={fieldErrors.email} /> : null}
          </div>

          {/* Password */}
          <div className="w-full flex flex-col gap-1">
            <Input
              label="Password"
              placeholder="*******"
              type="password"
              name="password"
              bg={true}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              autoComplete="current-password"
            />
            {fieldErrors.password ? (
              <InlineError text={fieldErrors.password} />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-customPurple transitions hover:bg-main flex-rows mt-6 mb-4 above-1000:mt-5 above-1000:mb-3 gap-4 text-white font-semibold p-4 above-1000:p-3 rounded-lg w-full disabled:opacity-60"
          >
            {loading ? (
              'Loading...'
            ) : (
              <>
                <FiLogIn /> Sign In
              </>
            )}
          </button>

          <p className="text-center text-border text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-customPurple font-semibold ml-2 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>

        {/* ✅ MOBILE 1:1 AD BELOW login form (same as Watch page mobile ad) */}
        {ADS_ENABLED ? (
          <div className="w-full sm:hidden mt-6">
            <EffectiveGateSquareAd
              refreshKey="login-mobile-below-form"
              className="my-0"
            />
          </div>
        ) : null}

        {/* RIGHT 1:1 AD — desktop only */}
        {ADS_ENABLED ? (
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <EffectiveGateSquareAd
              refreshKey="login-right"
              minWidthPx={1024}
              maxWidthPx={99999}
              minHeight={260}
              aspectRatio="1 / 1"
              className="my-0"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
