// frontend-next/src/components/reward/VerifyEmailClient.jsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { getUserInfo, setUserInfo } from '../../lib/client/auth';
import { apiFetch } from '../../lib/client/apiFetch';

export default function VerifyEmailClient({ token = '' }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const safe = String(token || '').trim();

    if (!safe) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch(
          `/api/users/verify-email?token=${encodeURIComponent(safe)}`
        );

        if (cancelled) return;

        const ui = getUserInfo();

        if (ui?._id && data?.user?._id && String(ui._id) === String(data.user._id)) {
          setUserInfo({
            ...ui,
            emailVerified: true,
            reward: {
              ...(ui.reward || {}),
              ...(data.user.reward || {}),
            },
          });
        }

        setStatus('success');
        setMessage(data?.message || 'Email verified successfully');

        if (data?.referral?.qualified) {
          toast.success('Referral bonus activated.');
        }
      } catch (e) {
        if (cancelled) return;

        setStatus('error');
        setMessage(e?.message || 'Verification failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <div className="bg-dry border border-border rounded-xl p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-white">
          {status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Please wait'}
        </h1>

        <p className="text-text mt-3">{message}</p>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link
            href="/reward"
            className="bg-customPurple text-white px-5 py-3 rounded font-semibold"
          >
            Go to Reward
          </Link>

          <Link
            href="/"
            className="border border-border text-white px-5 py-3 rounded font-semibold hover:bg-main transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
