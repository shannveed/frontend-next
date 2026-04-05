'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DesktopNavBar = dynamic(() => import('./NavBar'), {
  ssr: false,
});

const MobileNavBar = dynamic(() => import('./NavBarMobile'), {
  ssr: false,
});

const DESKTOP_QUERY = '(min-width: 1024px)';

function HeaderSkeleton() {
  return (
    <div className="bg-main shadow-md sticky top-0 z-20">
      <div className="lg:hidden border-b border-border">
        <div className="px-4 py-3 h-[64px]" />
      </div>

      <div className="hidden lg:block">
        <div className="container py-6 above-1000:py-4 px-8 h-[88px]" />
      </div>
    </div>
  );
}

export default function ResponsiveNavBar() {
  const [isDesktop, setIsDesktop] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);

    update();

    if (mql.addEventListener) {
      mql.addEventListener('change', update);
    } else {
      mql.addListener(update);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', update);
      } else {
        mql.removeListener(update);
      }
    };
  }, []);

  if (isDesktop === null) return <HeaderSkeleton />;

  return isDesktop ? <DesktopNavBar /> : <MobileNavBar />;
}
