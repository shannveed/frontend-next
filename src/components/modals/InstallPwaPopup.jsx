// src/components/modals/InstallPwaPopup.jsx
'use client';

import React from 'react';
import { MdInstallMobile } from 'react-icons/md';
import { IoShareOutline } from 'react-icons/io5';
import { AiOutlinePlusSquare } from 'react-icons/ai';

export default function InstallPwaPopup({
  open,
  onClose,
  onInstall,
  canInstall = false,
  isIOS = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl bg-dry border border-border p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-main border border-border flex items-center justify-center">
            <MdInstallMobile className="text-customPurple text-xl" />
          </div>
          <h3 className="text-lg font-semibold">Install MovieFrost</h3>
        </div>

        <p className="text-sm text-dryGray mb-4">
          Pin MovieFrost to your home screen / desktop and open it like a real app.
        </p>

        {canInstall ? (
          <button
            type="button"
            onClick={onInstall}
            className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded-md font-semibold"
          >
            Install / Add to Home Screen
          </button>
        ) : isIOS ? (
          <div className="bg-main border border-border rounded-lg p-4 text-sm text-white mb-4">
            <p className="font-semibold mb-2">How to add on iPhone / iPad:</p>
            <ol className="list-decimal ml-5 space-y-1 text-dryGray">
              <li>
                Tap{' '}
                <span className="text-white inline-flex items-center gap-1">
                  Share <IoShareOutline className="inline-block" />
                </span>{' '}
                in Safari.
              </li>
              <li>
                Tap{' '}
                <span className="text-white inline-flex items-center gap-1">
                  Add to Home Screen <AiOutlinePlusSquare className="inline-block" />
                </span>
                .
              </li>
              <li>
                Tap <span className="text-white">Add</span>.
              </li>
            </ol>
          </div>
        ) : (
          <div className="bg-main border border-border rounded-lg p-4 text-sm text-dryGray mb-4">
            Automatic install prompt is not available in this browser.
            <br />
            Try: browser menu → <span className="text-white">Install app</span> /{' '}
            <span className="text-white">Create shortcut</span>.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full border border-border hover:bg-main transition text-white py-3 rounded-md mt-3"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
