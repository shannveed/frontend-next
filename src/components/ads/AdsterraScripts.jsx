// src/components/ads/AdsterraScripts.jsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

// ✅ Delay non-critical ad scripts
const VIGNETTE_DELAY_MS = 20 * 1000; // fallback if no interaction
const POPUNDER_DELAY_MS = 3 * 60 * 1000; // 3 minutes after first interaction

const KEY_VIGNETTE = 'mf_ads_vignette_loaded';
const KEY_POPUNDER = 'mf_ads_popunder_loaded';

const VIGNETTE_SCRIPT_ID = 'mf-adsterra-vignette-inline';
const POPUNDER_SCRIPT_ID = 'mf-adsterra-popunder-inline';

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

// keep ads off account/admin/auth routes
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
  '/profile',
  '/password',
  '/favorites',
];
const EXCLUDED_EXACT = ['/login', '/register'];

const POPUNDER_INLINE = `
/*<![CDATA[/* */
(function(){var b=window,k="cc0bcd1a663aeae5974d111e7305d679",d=[["siteId",212-969*88*313+31904448],["minBid",0],["popundersPerIP","2"],["delayBetween",180],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],c=["d3d3LmludGVsbGlnZW5jZWFkeC5jb20vRS9rbDIwbi5taW4uanM=","ZDJrbHg4N2Jnem5nY2UuY2xvdWRmcm9udC5uZXQvZFREaU8vSVBjai9ucm91Z2guY3Nz","d3d3LnB5d21zcWF4a3NobmxjLmNvbS90Zi9sbDIwbi5taW4uanM=","d3d3LmVya21na2pxb2ZrYWN3LmNvbS9uVy94eGRhWS9rcm91Z2guY3Nz"],m=-1,e,r,j=function(){clearTimeout(r);m++;if(c[m]&&!(1795408142000<(new Date).getTime()&&1<m)){e=b.document.createElement("script");e.type="text/javascript";e.async=!0;var z=b.document.getElementsByTagName("script")[0];e.src="https://"+atob(c[m]);e.crossOrigin="anonymous";e.onerror=j;e.onload=function(){clearTimeout(r);b[k.slice(0,16)+k.slice(0,16)]||j()};r=setTimeout(j,5E3);z.parentNode.insertBefore(e,z)}};if(!b[k]){try{Object.freeze(b[k]=d)}catch(e){}j()}})();
/*]]>/* */
`;

const VIGNETTE_INLINE = `
(function(s){
  s.dataset.zone='10479252',
  s.src='https://gizokraijaw.net/vignette.min.js'
})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
`;

const getSessionFlag = (key) => {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const setSessionFlag = (key) => {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore
  }
};

const injectInlineScript = (id, code) => {
  if (typeof document === 'undefined') return false;
  if (document.getElementById(id)) return true;

  const script = document.createElement('script');
  script.id = id;
  script.type = 'text/javascript';
  script.setAttribute('data-cfasync', 'false');
  script.text = code;

  (document.body || document.documentElement).appendChild(script);
  return true;
};

export default function AdsterraScripts() {
  const pathname = usePathname() || '/';

  const isExcluded = useMemo(() => {
    if (!pathname) return false;
    if (EXCLUDED_EXACT.includes(pathname)) return true;
    return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
  }, [pathname]);

  const vignetteTimerRef = useRef(null);
  const popunderTimerRef = useRef(null);
  const idleIdRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  useEffect(() => {
    if (!ADS_ENABLED || isExcluded) return;
    if (typeof window === 'undefined') return;
    if (window.__MF_ADSTERRA_BOOTSTRAPPED__) return;

    window.__MF_ADSTERRA_BOOTSTRAPPED__ = true;

    const clearTimers = () => {
      if (vignetteTimerRef.current) clearTimeout(vignetteTimerRef.current);
      if (popunderTimerRef.current) clearTimeout(popunderTimerRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

      if (
        idleIdRef.current &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleIdRef.current);
      }

      vignetteTimerRef.current = null;
      popunderTimerRef.current = null;
      idleTimeoutRef.current = null;
      idleIdRef.current = null;

      window.__MF_POPUNDER_TIMER_STARTED__ = false;
    };

    const removeInteractionListeners = () => {
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstInteraction);
      });
    };

    const loadVignette = () => {
      if (window.__MF_VIGNETTE_LOADED__ || getSessionFlag(KEY_VIGNETTE)) return;

      try {
        const ok = injectInlineScript(VIGNETTE_SCRIPT_ID, VIGNETTE_INLINE);
        if (ok) {
          window.__MF_VIGNETTE_LOADED__ = true;
          setSessionFlag(KEY_VIGNETTE);
        }
      } catch (e) {
        console.warn('[ads] failed to inject vignette script:', e);
      }
    };

    const loadPopunder = () => {
      if (window.__MF_POPUNDER_LOADED__ || getSessionFlag(KEY_POPUNDER)) return;

      try {
        const ok = injectInlineScript(POPUNDER_SCRIPT_ID, POPUNDER_INLINE);
        if (ok) {
          window.__MF_POPUNDER_LOADED__ = true;
          setSessionFlag(KEY_POPUNDER);
        }
      } catch (e) {
        console.warn('[ads] failed to inject popunder script:', e);
      }
    };

    let interactionHandled = false;

    function onFirstInteraction() {
      if (interactionHandled) return;
      interactionHandled = true;

      removeInteractionListeners();

      if (vignetteTimerRef.current) {
        clearTimeout(vignetteTimerRef.current);
        vignetteTimerRef.current = null;
      }

      if (typeof window.requestIdleCallback === 'function') {
        idleIdRef.current = window.requestIdleCallback(
          () => {
            loadVignette();
            idleIdRef.current = null;
          },
          { timeout: 2000 }
        );
      } else {
        idleTimeoutRef.current = window.setTimeout(() => {
          loadVignette();
          idleTimeoutRef.current = null;
        }, 300);
      }

      if (
        !window.__MF_POPUNDER_TIMER_STARTED__ &&
        !getSessionFlag(KEY_POPUNDER)
      ) {
        window.__MF_POPUNDER_TIMER_STARTED__ = true;

        popunderTimerRef.current = window.setTimeout(() => {
          loadPopunder();
          window.__MF_POPUNDER_TIMER_STARTED__ = false;
          popunderTimerRef.current = null;
        }, POPUNDER_DELAY_MS);
      }
    }

    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstInteraction, { passive: true });
    });

    // Fallback: still load vignette later, but not during first paint
    if (!getSessionFlag(KEY_VIGNETTE) && !window.__MF_VIGNETTE_LOADED__) {
      vignetteTimerRef.current = window.setTimeout(() => {
        loadVignette();
        vignetteTimerRef.current = null;
      }, VIGNETTE_DELAY_MS);
    }

    return () => {
      clearTimers();
      removeInteractionListeners();
      window.__MF_ADSTERRA_BOOTSTRAPPED__ = false;
    };
  }, [isExcluded]);

  return null;
}
