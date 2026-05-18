// frontend-next/src/components/modals/RewardSharePopup.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import { FaGift } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

export default function RewardSharePopup({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-dry border border-border rounded-xl p-5 text-white"
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

        <div className="w-12 h-12 rounded-full bg-customPurple/20 border border-customPurple flex items-center justify-center">
          <FaGift className="text-customPurple text-xl" />
        </div>

        <h3 className="text-xl font-bold mt-4 pr-8">
          Share MovieFrost & earn rewards
        </h3>

        <p className="text-text text-sm leading-7 mt-2">
          Invite friends and family:
          <br />
          <span className="text-white font-semibold">3 Friends = 1 week</span>
          <br />
          <span className="text-white font-semibold">10 Friends = 1 month</span>
          <br />
          of popunder-free streaming.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="border border-border hover:bg-main transition text-white py-3 rounded font-semibold"
          >
            Later
          </button>

          <Link
            href="/reward"
            onClick={onClose}
            className="bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold text-center"
          >
            Open Reward
          </Link>
        </div>
      </div>
    </div>
  );
}
