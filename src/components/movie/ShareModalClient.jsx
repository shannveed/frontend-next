// src/components/movie/ShareModalClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FaFacebookF,
  FaTelegramPlane,
  FaEnvelope,
  FaPinterestP,
  FaWhatsapp,
  FaTwitter,
} from 'react-icons/fa';

export default function ShareModalClient({ open, onClose, movie }) {
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, [open]);

  const shareMessage = useMemo(() => {
    const name = movie?.name || 'this movie';
    return `Watch "${name}" Full HD on MovieFrost!`;
  }, [movie?.name]);

  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(shareUrl);
    const m = encodeURIComponent(shareMessage);

    return [
      {
        href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${m}`,
        icon: FaFacebookF,
        label: 'Facebook',
      },
      {
        href: `https://telegram.me/share/url?url=${u}&text=${m}`,
        icon: FaTelegramPlane,
        label: 'Telegram',
      },
      {
        href: `mailto:?subject=${encodeURIComponent(
          'Check out this movie'
        )}&body=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`,
        icon: FaEnvelope,
        label: 'Email',
      },
      {
        href: `https://pinterest.com/pin/create/button/?url=${u}&description=${m}`,
        icon: FaPinterestP,
        label: 'Pinterest',
      },
      {
        href: `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`,
        icon: FaWhatsapp,
        label: 'WhatsApp',
      },
      {
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `${shareMessage} ${shareUrl}`
        )}`,
        icon: FaTwitter,
        label: 'Twitter',
      },
    ];
  }, [shareUrl, shareMessage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999] p-4">
      <div className="relative inline-block w-full max-w-lg rounded-lg p-8 text-white bg-dry border border-border">
        <h2 className="text-xl text-center">
          Share{' '}
          <span className="text-xl font-bold">"{movie?.name || 'this movie'}"</span>
        </h2>

        <div className="flex flex-wrap gap-6 mt-6 justify-center">
          {shareLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform transform hover:scale-105"
                aria-label={link.label}
              >
                <div className="w-12 h-12 transitions hover:bg-customPurple flex items-center justify-center text-lg bg-white rounded bg-opacity-30">
                  <Icon />
                </div>
              </a>
            );
          })}
        </div>

        <button
          className="absolute top-3 right-4 text-white text-2xl focus:outline-none"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
