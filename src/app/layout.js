// frontend-next/src/app/layout.js
import './globals.css';
import Script from 'next/script';
import { SITE_URL } from '../lib/seo';

import Providers from './providers';
import SiteChrome from '../components/layout/SiteChrome';

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'MovieFrost — Watch Free Movies & Web Series Online',
    template: '%s | MovieFrost',
  },

  description: 'Watch free movies and web series online in HD on MovieFrost.',

  manifest: '/manifest.json',

  // ✅ IMPORTANT: tell browsers + crawlers where the favicon is
  icons: {
    icon: [
      // Many crawlers fetch this:
      { url: '/favicon.ico' }, // served by src/app/favicon.ico/route.js
      // Explicit PNG favicon (your file):
      { url: '/favicon1.png', type: 'image/png', sizes: '48x48' },
    ],
    shortcut: ['/favicon1.png'],
    apple: [{ url: '/images/MOVIEFROST.png', type: 'image/png', sizes: '180x180' }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MovieFrost',
  },
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
