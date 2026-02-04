// frontend-next/src/app/layout.js
import './globals.css';
import Script from 'next/script';
import { SITE_URL } from '../lib/seo';

import Providers from './providers';
import SiteChrome from '../components/layout/SiteChrome';

const buildVerification = () => {
  const v = {};
  const other = {};

  // Google Search Console (optional)
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  // Yandex
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;

  // Bing
  const bing = process.env.NEXT_PUBLIC_BING_VERIFICATION; // meta name: msvalidate.01


  if (google) v.google = google;
  if (yandex) v.yandex = yandex;

  if (bing) other['msvalidate.01'] = bing;


  if (Object.keys(other).length) v.other = other;

  return Object.keys(v).length ? v : undefined;
};

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'MovieFrost — Watch Free Movies & Web Series Online',
    template: '%s | MovieFrost',
  },

  description: 'Watch free movies and web series online in HD on MovieFrost.',

  manifest: '/manifest.json',

  icons: {
    icon: [{ url: '/images/favicon1.png', type: 'image/png' }],
    shortcut: ['/images/favicon1.png'],
    apple: [{ url: '/images/MOVIEFROST.png', type: 'image/png' }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MovieFrost',
  },

  // ✅ NEW: verification tags (Bing/Yandex/Baidu/Naver + optional Google)
  verification: buildVerification(),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080A1A',
};

export default function RootLayout({ children }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-main text-white min-h-screen" suppressHydrationWarning>
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;

                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        ) : null}

        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
