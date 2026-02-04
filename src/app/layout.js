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

  // ✅ Q1: Search Engine Verification Configuration
  verification: {
    // Google is likely handled via GSC file or analytics, but can be added here too:
    // google: 'your-google-code',
    
    // Yandex
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    
    // Yahoo (often uses Bing's code, but allows specific tag)
    yahoo: process.env.NEXT_PUBLIC_BING_VERIFICATION || undefined,
    
    // Other engines (Bing, Baidu, Naver) map to specific meta names
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
        'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION,
      }),
    },
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
