// frontend-next/src/components/reward/RewardPageClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaGift, FaShareAlt, FaCopy, FaCheckCircle } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import { getUserInfo } from '../../lib/client/auth';
import {
  captureReferralFromLocation,
  getReferralDeviceId,
  getStoredReferralCode,
} from '../../lib/client/rewardTracking';
import {
  applyReferral,
  claimReward,
  getMyRewardStatus,
  submitRewardFeedback,
} from '../../lib/client/rewards';

const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDaysLeft = (value) => {
  if (!value) return 0;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 0;

  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
};

function RewardPolicyModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-dry border border-border rounded-xl p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 flex-colo rounded bg-main border border-border hover:border-customPurple transition"
          aria-label="Close"
        >
          <IoClose />
        </button>

        <h2 className="text-xl font-bold pr-10">Ad Free Policy</h2>

        <div className="mt-4 text-sm text-text leading-7 space-y-3">
          <p>
            All popunder ads will be disabled for active reward users on the MovieFrost
            website.
          </p>

          <p>
            Server 2 and Server 3 use third-party video providers. Those third-party
            players may contain their own ads, and MovieFrost cannot fully control them.
          </p>

          <p>
            We keep native ads active because they are less distracting and help us keep
            the website running.
          </p>

          <p className="text-red-300">
            Do not try to exploit this Reward system. Fake accounts, self-referrals,
            duplicate devices, or suspicious activity can cause referral rejection and
            account blocking.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ label, current = 0, target = 3 }) {
  const pct = Math.max(0, Math.min(100, (Number(current || 0) / Number(target || 1)) * 100));

  return (
    <div className="bg-main border border-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-white font-semibold">{label}</span>
        <span className="text-dryGray">
          {Math.min(current, target)} / {target}
        </span>
      </div>

      <div className="h-2 bg-dry rounded-full overflow-hidden mt-3">
        <div
          className="h-full bg-customPurple"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RewardPageClient() {
  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;

  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [summary, setSummary] = useState(null);

  const [policyOpen, setPolicyOpen] = useState(false);

  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  useEffect(() => {
    captureReferralFromLocation();

    const ui = getUserInfo();
    setUserInfo(ui);

    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loadReward = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const data = await getMyRewardStatus(token);
      setSummary(data?.summary || null);
    } catch (e) {
      toast.error(e?.message || 'Failed to load reward status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const applyStoredReferral = async () => {
      if (!token) return;

      const ref = getStoredReferralCode();
      if (!ref) return;

      try {
        const deviceId = await getReferralDeviceId();
        const data = await applyReferral(token, {
          referralCode: ref,
          deviceId,
        });

        if (data?.result?.bonusUntil) {
          toast.success('Your 2-day reward has been activated.');
        }

        if (data?.summary) setSummary(data.summary);
      } catch {
        // ignore silent
      }
    };

    applyStoredReferral();
  }, [token]);

  const referralUrl = summary?.referralUrl || '';
  const adFreeActive = !!summary?.activeAdFree;
  const adFreeUntil = summary?.adFreeUntil || null;
  const daysLeft = getDaysLeft(adFreeUntil);
  const unclaimedCount = Number(summary?.unclaimedCount || 0);
  const qualifiedCount = Number(summary?.qualifiedCount || 0);
  const pendingCount = Number(summary?.pendingCount || 0);
  const rejectedCount = Number(summary?.rejectedCount || 0);

  const inviteText = useMemo(
    () =>
      `Join MovieFrost using my referral link and get 2 days of popunder-free streaming: ${referralUrl}`,
    [referralUrl]
  );

  const copyReferral = async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const shareReferral = async () => {
    if (!referralUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MovieFrost Reward',
          text: inviteText,
          url: referralUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteText);
        toast.success('Share text copied');
      }
    } catch {
      // user cancelled share
    }
  };

  const doClaim = async (tier) => {
    if (!token) {
      toast.error('Please login to claim reward');
      return;
    }

    try {
      setClaiming(true);

      const data = await claimReward(token, tier);
      setSummary(data?.summary || data?.summary || null);

      toast.success(data?.message || 'Reward activated');
      await loadReward();
    } catch (e) {
      toast.error(e?.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const sendFeedback = async (e) => {
    e.preventDefault();

    const msg = feedbackMessage.trim();

    if (msg.length < 2) {
      toast.error('Please write what we can improve');
      return;
    }

    try {
      setFeedbackSending(true);

      await submitRewardFeedback({
        name: feedbackName.trim(),
        email: feedbackEmail.trim(),
        message: msg,
      });

      toast.success('Thanks! Your message was sent to admin.');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackMessage('');
    } catch (err) {
      toast.error(err?.message || 'Failed to send feedback');
    } finally {
      setFeedbackSending(false);
    }
  };

  return (
    <>
      <RewardPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />

      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        <div className="bg-dry border border-border rounded-2xl p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
                MovieFrost Reward
              </p>

              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
                Invite Friends & Earn Ad-Free Streaming
              </h1>

              <p className="text-text leading-7 mt-3 max-w-3xl">
                Share MovieFrost with real friends and family. When qualified friends
                join using your referral link, you can claim popunder-free streaming rewards.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPolicyOpen(true)}
              className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-5 py-3 rounded font-semibold"
            >
              Ad Free Policy
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="bg-main border border-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <FaGift className="text-customPurple text-2xl" />
                <div>
                  <h2 className="text-white font-semibold text-lg">
                    3 Friends = 1 Week
                  </h2>
                  <p className="text-dryGray text-sm mt-1">
                    Invite 3 qualified friends and claim 1 week of ad-free streaming.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-main border border-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <FaGift className="text-customPurple text-2xl" />
                <div>
                  <h2 className="text-white font-semibold text-lg">
                    10 Friends = 1 Month
                  </h2>
                  <p className="text-dryGray text-sm mt-1">
                    Save your qualified referrals and claim 1 full month.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={sendFeedback}
            className="bg-main border border-border rounded-xl p-5 mt-6"
          >
            <h2 className="text-white font-semibold text-lg">
              What can we improve?
            </h2>

            <p className="text-dryGray text-sm mt-1">
              No login required. Your message will go directly to the admin notification bell.
            </p>

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <input
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full bg-dry border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
              />

              <input
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                placeholder="Your email (optional)"
                type="email"
                className="w-full bg-dry border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
              />
            </div>

            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Tell us what we can improve..."
              className="w-full bg-dry border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple min-h-[120px] mt-3"
            />

            <button
              type="submit"
              disabled={feedbackSending}
              className="mt-3 bg-customPurple hover:bg-opacity-90 transition text-white px-5 py-3 rounded font-semibold disabled:opacity-60"
            >
              {feedbackSending ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 mt-6">
          <div className="bg-dry border border-border rounded-2xl p-5 sm:p-6">
            <h2 className="text-white text-xl font-semibold">Your Reward Progress</h2>

            {!token ? (
              <div className="bg-main border border-border rounded-xl p-5 mt-5">
                <h3 className="text-white font-semibold">Login required</h3>
                <p className="text-text text-sm leading-7 mt-2">
                  You can read the reward rules without login, but ad-free rewards require a
                  MovieFrost account so we can track real unique referrals.
                </p>

                <div className="flex flex-wrap gap-3 mt-4">
                  <Link
                    href="/login"
                    className="bg-customPurple text-white px-5 py-3 rounded font-semibold"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="border border-border text-white px-5 py-3 rounded font-semibold hover:bg-main transition"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ) : loading ? (
              <p className="text-dryGray text-sm mt-5">Loading reward status...</p>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-3 mt-5">
                  <div className="bg-main border border-border rounded-lg p-4">
                    <p className="text-dryGray text-xs">Qualified Friends</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {qualifiedCount}
                    </p>
                  </div>

                  <div className="bg-main border border-border rounded-lg p-4">
                    <p className="text-dryGray text-xs">Pending Verification</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {pendingCount}
                    </p>
                  </div>

                  <div className="bg-main border border-border rounded-lg p-4">
                    <p className="text-dryGray text-xs">Rejected / Fraud Filter</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {rejectedCount}
                    </p>
                  </div>
                </div>

                <div className="bg-main border border-border rounded-xl p-5 mt-5">
                  <div className="flex items-start gap-3">
                    <FaCheckCircle
                      className={adFreeActive ? 'text-green-400 mt-1' : 'text-border mt-1'}
                    />

                    <div>
                      <h3 className="text-white font-semibold">
                        {adFreeActive ? 'Reward active' : 'No active reward yet'}
                      </h3>

                      {adFreeActive ? (
                        <p className="text-text text-sm mt-1">
                          Your popunder-free reward expires on{' '}
                          <span className="text-white">{formatDateTime(adFreeUntil)}</span>
                          {daysLeft ? ` (${daysLeft} day(s) left)` : ''}.
                        </p>
                      ) : (
                        <p className="text-text text-sm mt-1">
                          Share your referral link with unique friends and claim a reward.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  <ProgressBar
                    label="Progress to 1 Week"
                    current={Math.min(unclaimedCount, 3)}
                    target={3}
                  />

                  <ProgressBar
                    label="Progress to 1 Month"
                    current={Math.min(unclaimedCount, 10)}
                    target={10}
                  />
                </div>

                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => doClaim(3)}
                    disabled={claiming || unclaimedCount < 3}
                    className="bg-customPurple hover:bg-opacity-90 transition text-white px-5 py-3 rounded font-semibold disabled:opacity-50"
                  >
                    Claim 1 Week
                  </button>

                  <button
                    type="button"
                    onClick={() => doClaim(10)}
                    disabled={claiming || unclaimedCount < 10}
                    className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-3 rounded font-semibold disabled:opacity-50"
                  >
                    Claim 1 Month
                  </button>
                </div>

                <p className="text-xs text-dryGray mt-3">
                  Unclaimed qualified friends: {unclaimedCount}. After your reward expires,
                  keep sharing with unique friends and claim again when you reach a tier.
                </p>
              </>
            )}
          </div>

          <aside className="bg-dry border border-border rounded-2xl p-5 sm:p-6">
            <h2 className="text-white text-xl font-semibold">Your Referral Link</h2>

            {token && referralUrl ? (
              <>
                <p className="text-dryGray text-sm mt-2">
                  Share this link. New users joining from your link get a 2-day reward
                  after verification.
                </p>

                <div className="bg-main border border-border rounded-lg p-3 mt-4 break-all text-sm text-white font-mono">
                  {referralUrl}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={copyReferral}
                    className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-4 py-3 rounded font-semibold flex items-center justify-center gap-2"
                  >
                    <FaCopy /> Copy
                  </button>

                  <button
                    type="button"
                    onClick={shareReferral}
                    className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-3 rounded font-semibold flex items-center justify-center gap-2"
                  >
                    <FaShareAlt /> Share
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-main border border-border rounded-lg p-4 mt-4">
                <p className="text-text text-sm leading-7">
                  Login or register to get your unique referral link.
                </p>

                <Link
                  href="/login"
                  className="inline-block mt-3 bg-customPurple text-white px-5 py-3 rounded font-semibold"
                >
                  Login
                </Link>
              </div>
            )}

            <div className="bg-main border border-border rounded-lg p-4 mt-5">
              <h3 className="text-white font-semibold">Fraud prevention</h3>
              <ul className="text-dryGray text-sm leading-7 list-disc ml-5 mt-2">
                <li>Same IP abuse is filtered.</li>
                <li>Duplicate device/browser fingerprint is filtered.</li>
                <li>Email verification is required before a friend counts.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
