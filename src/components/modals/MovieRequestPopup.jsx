'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getUserInfo } from '../../lib/client/auth';
import { createWatchRequest } from '../../lib/client/watchRequests';

const PENDING_KEY = 'pendingWatchRequest';

export default function MovieRequestPopup({ open, onClose }) {
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!open) return;
    setUserInfo(getUserInfo());
  }, [open]);

  if (!open) return null;

  const isLoggedIn = !!userInfo?.token;

  const savePending = (t) => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ title: t, ts: Date.now() }));
    } catch {}
  };

  const handleLogin = () => {
    const trimmed = title.trim();
    if (trimmed.length >= 2) savePending(trimmed);
    onClose?.();
    window.location.href = '/login'; // CRA fallback
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = title.trim();
    if (trimmed.length < 2) {
      toast.error('Please enter a valid movie/web series name');
      return;
    }

    if (!isLoggedIn) {
      savePending(trimmed);
      toast.error('Please login to submit your request.');
      onClose?.();
      window.location.href = '/login';
      return;
    }

    try {
      setSending(true);
      await createWatchRequest(userInfo.token, trimmed);

      toast.success('Request sent to admin. Reply will appear in notifications.');
      setTitle('');
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl bg-dry border border-border p-5 text-white">
        <h3 className="text-lg font-semibold mb-2">What do you want to watch?</h3>

        <p className="text-sm text-dryGray mb-4">
          Tell us the movie/web series name. Admin will send you the link.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Avengers Endgame / Money Heist"
            className="w-full bg-main border border-border rounded-md px-3 py-3 text-sm outline-none focus:border-customPurple"
          />

          <div className={`grid gap-3 ${isLoggedIn ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <button
              disabled={sending}
              type="submit"
              className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded-md font-semibold disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Submit'}
            </button>

            {!isLoggedIn && (
              <button
                type="button"
                onClick={handleLogin}
                className="w-full border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition py-3 rounded-md font-semibold"
              >
                Login
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full border border-border hover:bg-main transition text-white py-3 rounded-md"
          >
            Close
          </button>
        </form>
      </div>
    </div>
  );
}
