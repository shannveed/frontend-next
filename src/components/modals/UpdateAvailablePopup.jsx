// frontend-next/src/components/modals/UpdateAvailablePopup.jsx
'use client';

import React from 'react';

export default function UpdateAvailablePopup({
  open,
  updating = false,
  onUpdate,
  onDismiss,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-[9999] px-3">
      <div className="mx-auto max-w-md bg-dry border border-customPurple rounded-lg p-4 shadow-xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">
            A new version is available.
          </p>
          <p className="text-dryGray text-xs mt-0.5">
            Click update to load the latest deployment.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            disabled={updating}
            className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition text-white disabled:opacity-60"
          >
            Later
          </button>

          <button
            type="button"
            onClick={onUpdate}
            disabled={updating}
            className="px-3 py-2 text-xs bg-customPurple hover:bg-opacity-90 transition text-white rounded font-semibold disabled:opacity-60"
          >
            {updating ? 'Updating…' : 'Update Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
