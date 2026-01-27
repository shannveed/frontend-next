// src/components/ads/AdsterraScripts.jsx
'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

// 4 minutes
const POPUNDER_DELAY_MS = 4 * 60 * 1000;

// session keys so scripts load once per session
const KEY_VIGNETTE = 'mf_ads_vignette_loaded';
const KEY_POPUNDER = 'mf_ads_popunder_loaded';

// Your popunder inline script (exact)
const POPUNDER_INLINE = `
/*<![CDATA[/* */
(function(){var b=window,k="cc0bcd1a663aeae5974d111e7305d679",d=[["siteId",212-969*88*313+31904448],["minBid",0],["popundersPerIP","2"],["delayBetween",180],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],c=["d3d3LmludGVsbGlnZW5jZWFkeC5jb20vRS9rbDIwbi5taW4uanM=","ZDJrbHg4N2Jnem5nY2UuY2xvdWRmcm9udC5uZXQvZFREaU8vSVBjai9ucm91Z2guY3Nz","d3d3LnB5d21zcWF4a3NobmxjLmNvbS90Zi9sbDIwbi5taW4uanM=","d3d3LmVya21na2pxb2ZrYWN3LmNvbS9uVy94eGRhWS9rcm91Z2guY3Nz"],m=-1,e,r,j=function(){clearTimeout(r);m++;if(c[m]&&!(1795408142000<(new Date).getTime()&&1<m)){e=b.document.createElement("script");e.type="text/javascript";e.async=!0;var z=b.document.getElementsByTagName("script")[0];e.src="https://"+atob(c[m]);e.crossOrigin="anonymous";e.onerror=j;e.onload=function(){clearTimeout(r);b[k.slice(0,16)+k.slice(0,16)]||j()};r=setTimeout(j,5E3);z.parentNode.insertBefore(e,z)}};if(!b[k]){try{Object.freeze(b[k]=d)}catch(e){}j()}})();
/*]]>/* */
`;

export default function AdsterraScripts() {
  const popTimerRef = useRef(null);

  // ✅ delayed popunder after 4 minutes
  useEffect(() => {
    if (!ADS_ENABLED) return;

    // schedule once per session
    try {
      if (sessionStorage.getItem(KEY_POPUNDER) === '1') return;
    } catch {}

    popTimerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(KEY_POPUNDER, '1');
      } catch {}

      try {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.setAttribute('data-cfasync', 'false');
        s.text = POPUNDER_INLINE;

        (document.body || document.documentElement).appendChild(s);
      } catch (e) {
        console.warn('[ads] failed to inject popunder script:', e);
      }
    }, POPUNDER_DELAY_MS);

    return () => {
      if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    };
  }, []);

  if (!ADS_ENABLED) return null;

  // ✅ immediate vignette (loads asap after interactive)
  // Use Script so Next ensures it’s only inserted once.
  return (
    <Script id="adsterra-vignette" strategy="afterInteractive">
      {`
        (function(s){
          s.dataset.zone='10479252',
          s.src='https://gizokraijaw.net/vignette.min.js'
        })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));

        try { sessionStorage.setItem('${KEY_VIGNETTE}', '1'); } catch(e) {}
      `}
    </Script>
  );
}
