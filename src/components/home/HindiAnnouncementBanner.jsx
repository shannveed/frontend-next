'use client';

import React, { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';

const STORAGE_KEY = 'mf_hide_hindi_announcement_v1';

const HINDI_SITE_URL = (
  process.env.NEXT_PUBLIC_HINDI_SITE_URL || 'https://hi.moviefrost.com'
).replace(/\/+$/, '');

export default function HindiAnnouncementBanner() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setHidden(saved === '1');
    } catch {
      setHidden(false);
    } finally {
      setMounted(true);
    }
  }, []);

  const closeBanner = () => {
    setHidden(true);

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!mounted || hidden) return null;

  return (
    <div className="w-full border-b border-border bg-gradient-to-r from-[#09152c] via-[#182361] to-[#09142c]">
      <div className="container mx-auto px-3 sm:px-8">
        <div className="min-h-[34px] sm:min-h-[38px] flex items-center justify-between gap-2 py-1">
          <div className="min-w-0 flex-1 flex items-center justify-center gap-2 text-center">
            <p className="text-[11px] sm:text-xs md:text-sm leading-5 text-white/90 truncate">
              <span className="hidden sm:inline">
                Enjoy Moviefrost in Hindi — a platform specially designed for Hindi viewers for the best experience
              </span>

              <span className="sm:hidden">
                Built Especially for Hindi viewers
              </span>
            </p>

            <a
              href={`${HINDI_SITE_URL}/`}
              className="shrink-0 inline-flex items-center rounded-full bg-customPurple px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-white hover:bg-opacity-90 transition"
            >
              MovieFrost Hindi
            </a>
          </div>

          <button
            type="button"
            onClick={closeBanner}
            aria-label="Close Hindi announcement"
            className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full border border-border bg-main/70 text-white/80 hover:text-white hover:border-customPurple transition"
          >
            <IoClose className="text-sm sm:text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}
