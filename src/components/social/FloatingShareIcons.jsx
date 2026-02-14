'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { usePathname } from 'next/navigation';

import {
  FaTelegramPlane,
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const ENABLED =
  String(process.env.NEXT_PUBLIC_FLOATING_SHARE_ICONS ?? 'true').toLowerCase() ===
  'true';

// ✅ Q3 timings
const INITIAL_DELAY_MS = 30_000; // first icon at 30s
const VISIBLE_MS = 10_000; // icon stays visible 10s
const GAP_FIRST_CYCLE_MS = 30_000; // cycle 1: 30s between icons
const GAP_AFTER_MS = 60_000; // cycle 2+: 60s between icons

// Don’t show on admin pages/login/register (adjust as you like)
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
];
const EXCLUDED_EXACT = ['/login', '/register'];

const buildShareText = () => {
  const title = typeof document !== 'undefined' ? document.title : 'MovieFrost';
  return `Check this out on MovieFrost: ${title}`;
};

const safeOpen = (href) => {
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = href;
  }
};

export default function FloatingShareIcons() {
  const pathname = usePathname() || '/';

  const excluded = useMemo(() => {
    if (!pathname) return false;
    if (EXCLUDED_EXACT.includes(pathname)) return true;
    return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
  }, [pathname]);

  const items = useMemo(
    () => [
      {
        key: 'telegram',
        label: 'Share on Telegram',
        bg: '#229ED9',
        Icon: FaTelegramPlane,
        buildHref: (url, text) =>
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
            text
          )}`,
      },
      {
        key: 'whatsapp',
        label: 'Share on WhatsApp',
        bg: '#25D366',
        Icon: FaWhatsapp,
        buildHref: (url, text) =>
          `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      },
      {
        key: 'facebook',
        label: 'Share on Facebook',
        bg: '#1877F2',
        Icon: FaFacebookF,
        buildHref: (url) =>
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      },
      {
        key: 'x',
        label: 'Share on X',
        bg: '#000000',
        Icon: FaXTwitter,
        buildHref: (url, text) =>
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text
          )}&url=${encodeURIComponent(url)}`,
      },
      {
        key: 'instagram',
        label: 'Share (Instagram)',
        bg: '#E4405F',
        Icon: FaInstagram,
        onClick: async (url, text) => {
          // Best: native share sheet (often includes Instagram on mobile)
          if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({
              title: document.title || 'MovieFrost',
              text,
              url,
            });
            return;
          }

          // Fallback: copy link (user can paste into Instagram)
          try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied — paste it into Instagram');
          } catch {
            toast.error('Copy failed — please copy the URL manually');
          }
        },
      },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const showCountRef = useRef(0);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearTimers = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    showTimerRef.current = null;
    hideTimerRef.current = null;
  };

  const scheduleNextShow = useCallback(
    (delayMs) => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);

      showTimerRef.current = window.setTimeout(() => {
        const count = showCountRef.current;
        const idx = count % items.length;
        const cycle = Math.floor(count / items.length);

        // ✅ first run 30s, second run+ 60s
        const gap = cycle === 0 ? GAP_FIRST_CYCLE_MS : GAP_AFTER_MS;

        showCountRef.current = count + 1;

        setCurrentIndex(idx);
        setVisible(true);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
          setVisible(false);
        }, VISIBLE_MS);

        // schedule next one
        scheduleNextShow(gap);
      }, delayMs);
    },
    [items.length]
  );

  useEffect(() => {
    if (!ENABLED) return;

    scheduleNextShow(INITIAL_DELAY_MS);

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleNextShow]);

  const current = items[currentIndex] || null;

  const handleClick = async () => {
    if (!current) return;

    const url = window.location.href;
    const text = buildShareText();

    try {
      if (typeof current.onClick === 'function') {
        await current.onClick(url, text);
      } else if (typeof current.buildHref === 'function') {
        safeOpen(current.buildHref(url, text));
      }
    } catch (e) {
      toast.error(e?.message || 'Share failed');
    } finally {
      setVisible(false);
    }
  };

  if (!ENABLED || excluded || !current) return null;

  const Icon = current.Icon;

  return (
    <div className="fixed right-4 bottom-24 sm:bottom-6 z-[55]">
      <div
        className={[
          'mf-animated-ring transition-all duration-300',
          visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-95 pointer-events-none',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label={current.label}
          title={current.label}
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-border"
          style={{ backgroundColor: current.bg }}
        >
          <Icon className="text-white text-xl" />
        </button>
      </div>
    </div>
  );
}
