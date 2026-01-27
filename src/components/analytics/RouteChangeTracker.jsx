// frontend-next/src/components/analytics/RouteChangeTracker.jsx
'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function RouteChangeTrackerInner() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const didFirstRun = useRef(false);

  const qs = sp?.toString?.() || '';
  const page_path = qs ? `${pathname}?${qs}` : pathname;

  useEffect(() => {
    if (!GA_ID) return;
    if (typeof window === 'undefined') return;

    // ✅ Skip first run because layout.js already sent the initial page_view
    if (!didFirstRun.current) {
      didFirstRun.current = true;
      return;
    }

    let cancelled = false;
    let tries = 0;

    const send = () => {
      if (cancelled) return;

      if (typeof window.gtag === 'function') {
        window.gtag('config', GA_ID, {
          page_path,
          page_location: window.location.href,
        });
        return;
      }

      // Retry briefly if GA hasn't attached yet
      if (tries < 20) {
        tries += 1;
        setTimeout(send, 200);
      }
    };

    send();

    return () => {
      cancelled = true;
    };
  }, [page_path]);

  return null;
}

export default function RouteChangeTracker() {
  // ✅ Required by Next.js when using useSearchParams()
  return (
    <Suspense fallback={null}>
      <RouteChangeTrackerInner />
    </Suspense>
  );
}
