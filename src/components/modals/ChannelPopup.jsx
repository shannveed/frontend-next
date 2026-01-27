// src/components/modals/ChannelPopup.jsx
'use client';

import React from 'react';

export default function ChannelPopup({
  open,
  onClose,
  title,
  description,
  url,
  buttonText = 'Open',
  Icon,
  showMaybeLater = true,
  maybeLaterText = 'Maybe later',
}) {
  if (!open) return null;

  const safeUrl = typeof url === 'string' ? url.trim() : '';

  const handleOpenClick = () => {
    // Let the tab open first, then close modal
    window.setTimeout(() => {
      onClose?.();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl bg-dry border border-border p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          {Icon ? (
            <div className="w-10 h-10 rounded-full bg-main border border-border flex items-center justify-center">
              <Icon className="text-customPurple text-xl" />
            </div>
          ) : null}

          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {description ? (
          <p className="text-sm text-dryGray mb-4">{description}</p>
        ) : null}

        <div className="flex flex-col gap-3">
          {safeUrl ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenClick}
              className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded-md font-semibold text-center"
            >
              {buttonText}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full bg-customPurple/60 text-white py-3 rounded-md font-semibold cursor-not-allowed"
            >
              {buttonText}
            </button>
          )}

          {showMaybeLater ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full border border-border hover:bg-main transition text-white py-3 rounded-md"
            >
              {maybeLaterText}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
