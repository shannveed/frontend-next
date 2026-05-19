// frontend-next/src/components/reward/RewardActivityTracker.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FaGift, FaSparkles } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import { getUserInfo } from '../../lib/client/auth';
import { trackRewardActivity } from '../../lib/client/rewards';

export const REWARD_BONUS_UNLOCKED_EVENT = 'mf-reward-bonus-unlocked';

const ACTIVITY_INTERVAL_MS = 30_000;
const ACTIVITY_SECONDS_PER_TICK = 30;

const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/movieslist',
  '/addmovie',
  '/edit',
  '/bulk-create',
  '/get-movies',
  '/update-movies',
  '/push-notification',
  '/categories',
  '/users',
  '/blog-posts',
  '/blog-preview',
  '/get-blog-posts',
  '/bulk-create-blog-posts',
  '/update-blog-posts',
];

const EXCLUDED_EXACT = ['/login', '/register', '/signup'];

function BonusUnlockedPopup({ open, onClose, adFreeUntil }) {
  if (!open) return null;

  const dateLabel = adFreeUntil
    ? new Date(adFreeUntil).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <style jsx>{`
        @keyframes mfRewardPop {
          0% {
            transform: scale(0.72) rotate(-4deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.06) rotate(2deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }

        @keyframes mfRewardFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes mfRewardGlow {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(27, 130, 255, 0);
          }
          50% {
            box-shadow: 0 0 34px rgba(27, 130, 255, 0.55);
          }
        }

        .reward-card {
          animation: mfRewardPop 520ms ease-out both;
        }

        .reward-gift {
          animation: mfRewardFloat 1.5s ease-in-out infinite,
            mfRewardGlow 1.6s ease-in-out infinite;
        }
      `}</style>

      <div
        className="reward-card relative w-full max-w-md overflow-hidden rounded-2xl border border-customPurple bg-dry p-6 text-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded bg-main/80 border border-border hover:border-customPurple transition"
          aria-label="Close"
        >
          <IoClose />
        </button>

        <div className="pointer-events-none absolute -top-10 left-8 text-customPurple/30">
          <FaSparkles className="text-5xl" />
        </div>

        <div className="pointer-events-none absolute -bottom-10 right-8 text-customPurple/30">
          <FaSparkles className="text-6xl" />
        </div>

        <div className="reward-gift mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-customPurple text-white">
          <FaGift className="text-4xl" />
        </div>

        <h2 className="mt-5 text-2xl font-bold">Reward Unlocked!</h2>

        <p className="mt-3 text-sm leading-7 text-text">
          You received{' '}
          <span className="font-semibold text-white">
            2 days of ad-free streaming
          </span>{' '}
          for joining through a referral.
        </p>

        {dateLabel ? (
          <p className="mt-2 text-xs text-dryGray">
            Active until: <span className="text-white">{dateLabel}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded bg-customPurple py-3 font-semibold text-white hover:bg-opacity-90 transition"
        >
          Awesome
        </button>
      </div>
    </div>
  );
}

export default function RewardActivityTracker() {
  const pathname = usePathname() || '/';

  const [popupOpen, setPopupOpen] = useState(false);
  const [adFreeUntil, setAdFreeUntil] = useState('');

  const excluded = useMemo(() => {
    if (EXCLUDED_EXACT.includes(pathname)) return true;
    return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  useEffect(() => {
    const handler = (event) => {
      const until = event?.detail?.adFreeUntil || '';
      setAdFreeUntil(until);
      setPopupOpen(true);
    };

    window.addEventListener(REWARD_BONUS_UNLOCKED_EVENT, handler);
    return () => window.removeEventListener(REWARD_BONUS_UNLOCKED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (excluded) return;

    let disposed = false;
    let inFlight = false;

    const tick = async () => {
      if (disposed || inFlight) return;

      if (typeof document !== 'undefined') {
        if (document.visibilityState !== 'visible') return;
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
      }

      const ui = getUserInfo();
      if (!ui?.token || ui?.isAdmin) return;

      try {
        inFlight = true;

        const data = await trackRewardActivity(ui.token, {
          kind: 'site',
          seconds: ACTIVITY_SECONDS_PER_TICK,
        });

        if (disposed) return;

        if (data?.result?.bonusGranted) {
          const until = data?.result?.adFreeUntil || data?.summary?.adFreeUntil || '';
          setAdFreeUntil(until);
          setPopupOpen(true);
        }
      } catch {
        // Silent; this tracker should never annoy users.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(tick, ACTIVITY_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [excluded]);

  return (
    <BonusUnlockedPopup
      open={popupOpen}
      adFreeUntil={adFreeUntil}
      onClose={() => setPopupOpen(false)}
    />
  );
}
