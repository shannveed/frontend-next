'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MobileFooter = dynamic(() => import('./MobileFooter'), {
  ssr: false,
});

const MOBILE_QUERY = '(max-width: 1023px)';

export default function ResponsiveMobileFooter() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);

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

  if (!isMobile) return null;

  return <MobileFooter />;
}
