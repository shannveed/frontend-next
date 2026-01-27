'use client';

import React, { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function RouteChangeTrackerInner() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp?.toString?.() || '';

  useEffect(() => {
    if (!GA_ID) return;
    if (typeof window === 'undefined') return;
    if (typeof window.gtag !== 'function') return;

    const page_path = qs ? `${pathname}?${qs}` : pathname;

    window.gtag('event', 'page_view', {
      page_path,
      page_location: window.location.href,
    });
  }, [pathname, qs]);

  return null;
}

export default function RouteChangeTracker() {
  // ✅ Required by Next.js to avoid missing-suspense-with-csr-bailout
  return (
    <Suspense fallback={null}>
      <RouteChangeTrackerInner />
    </Suspense>
  );
}
