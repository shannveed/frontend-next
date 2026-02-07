// frontend-next/src/components/ads/EzoicScripts.jsx
import Script from 'next/script';

/**
 * Toggle Ezoic scripts ONLY when you want to verify.
 * Keep these disabled until you are ready to go live with Ezoic.
 *
 * Vercel env suggestion:
 *  - NEXT_PUBLIC_EZOIC_VERIFY=true   (temporary for verification)
 *  - NEXT_PUBLIC_EZOIC_VERIFY=false  (default)
 */
const EZOIC_ENABLED =
  process.env.NEXT_PUBLIC_EZOIC_VERIFY === 'true' ||
  process.env.NEXT_PUBLIC_EZOIC_ENABLED === 'true';

export default function EzoicScripts() {
  if (!EZOIC_ENABLED) return null;

  return (
    <>
      {/* Privacy scripts (must load first) */}
      <Script
        id="ezoic-privacy-min"
        data-cfasync="false"
        src="https://cmp.gatekeeperconsent.com/min.js"
        strategy="beforeInteractive"
      />
      <Script
        id="ezoic-privacy-cmp"
        data-cfasync="false"
        src="https://the.gatekeeperconsent.com/cmp.min.js"
        strategy="beforeInteractive"
      />

      {/* Command queue (safe to define before Ezoic loads) */}
      <Script id="ezoic-standalone-init" strategy="beforeInteractive">
        {`
          window.ezstandalone = window.ezstandalone || {};
          window.ezstandalone.cmd = window.ezstandalone.cmd || [];
        `}
      </Script>

      {/* Ezoic header script */}
      <Script
        id="ezoic-header"
        src="https://www.ezojs.com/ezoic/sa.min.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
