'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

// ✅ Q1: run popunder scripts after 1 minute
const POPUNDER_DELAY_MS = 1 * 60 * 1000;

// session keys so scripts load once per session
const KEY_VIGNETTE = 'mf_ads_vignette_loaded';
const KEY_POPUNDER = 'mf_ads_popunder_loaded';

// ✅ Popunder scripts (provided by you)
const EFFECTIVEGATE_POPUNDER_SRC =
  'https://pl27010453.effectivegatecpm.com/62/c8/f3/62c8f34a5a4d1afbb8ec9a7b28896caa.js';

const TAG_ZONE = '10417326';
const TAG_SRC = 'https://al5sm.com/tag.min.js';

const getAppendHost = () =>
  [document.documentElement, document.body].filter(Boolean).pop() ||
  document.body ||
  document.documentElement;

const injectExternalScript = ({ src, dataset = {}, attrs = {} }) => {
  if (!src) return false;

  // prevent duplicates
  if (document.querySelector(`script[src="${src}"]`)) return true;

  const host = getAppendHost();
  if (!host) return false;

  const s = document.createElement('script');
  s.async = true;
  s.src = src;

  Object.entries(dataset).forEach(([k, v]) => {
    try {
      s.dataset[k] = String(v);
    } catch {
      // ignore
    }
  });

  Object.entries(attrs).forEach(([k, v]) => {
    try {
      s.setAttribute(k, String(v));
    } catch {
      // ignore
    }
  });

  host.appendChild(s);
  return true;
};

export default function AdsterraScripts() {
  const timerRef = useRef(null);

  // ✅ delayed popunder (Q1)
  useEffect(() => {
    if (!ADS_ENABLED) return;

    try {
      if (sessionStorage.getItem(KEY_POPUNDER) === '1') return;
    } catch {}

    timerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(KEY_POPUNDER, '1');
      } catch {}

      try {
        // Script #1
        injectExternalScript({
          src: EFFECTIVEGATE_POPUNDER_SRC,
          attrs: { 'data-cfasync': 'false' },
        });

        // Script #2 (equivalent to your inline IIFE)
        injectExternalScript({
          src: TAG_SRC,
          dataset: { zone: TAG_ZONE },
          attrs: { 'data-cfasync': 'false' },
        });
      } catch (e) {
        console.warn('[ads] popunder injection failed:', e);
      }
    }, POPUNDER_DELAY_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!ADS_ENABLED) return null;

  // ✅ keep existing vignette behavior
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
