// frontend-next/src/components/modals/RewardReferralCapture.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaGift } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';

import { getUserInfo } from '../../lib/client/auth';
import {
  captureReferralFromLocation,
  clearStoredReferralCode,
  getReferralDeviceId,
  getStoredReferralCode,
} from '../../lib/client/rewardTracking';
import { applyReferral } from '../../lib/client/rewards';

export default function RewardReferralCapture() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const captured = captureReferralFromLocation();
    const stored = captured || getStoredReferralCode();

    if (!stored) return;

    setReferralCode(stored);

    const ui = getUserInfo();

    if (!ui?.token) {
      setOpen(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const deviceId = await getReferralDeviceId();

        const data = await applyReferral(ui.token, {
          referralCode: stored,
          deviceId,
        });

        if (cancelled) return;

        if (data?.result?.bonusUntil) {
          toast.success('Your 2-day reward has been activated.');
        }

        clearStoredReferralCode();
      } catch {
        clearStoredReferralCode();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const goAuth = (href) => {
    try {
      localStorage.setItem(
        'redirectAfterLogin',
        JSON.stringify({
          pathname: '/reward',
          search: referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '',
          hash: '',
          scrollY: 0,
        })
      );
    } catch {
      // ignore
    }

    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md bg-dry border border-border rounded-xl p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 w-9 h-9 flex-colo rounded bg-main border border-border hover:border-customPurple transition"
          aria-label="Close"
        >
          <IoClose />
        </button>

        <div className="w-12 h-12 rounded-full bg-customPurple/20 border border-customPurple flex items-center justify-center">
          <FaGift className="text-customPurple text-xl" />
        </div>

        <h3 className="text-xl font-bold mt-4 pr-8">
          You were invited to MovieFrost
        </h3>

        <p className="text-text text-sm leading-7 mt-2">
          Login or register with this referral to receive{' '}
          <span className="text-white font-semibold">2 days of popunder-free streaming</span>.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={() => goAuth('/login')}
            className="bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold"
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => goAuth('/register')}
            className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition py-3 rounded font-semibold"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
