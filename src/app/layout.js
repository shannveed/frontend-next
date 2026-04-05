// frontend-next/src/app/layout.js
import './globals.css';
import { Poppins } from 'next/font/google';
import { SITE_URL } from '../lib/seo';

import Providers from './providers';
import SiteChrome from '../components/layout/SiteChrome';

// ✅ Self-hosted Google font via next/font (no render-blocking fonts.googleapis.com request)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

const buildVerification = () => {
  const v = {};
  const other = {};

  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;
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

  other: {
    'mobile-web-app-capable': 'yes',
  },

  verification: buildVerification(),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080A1A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.className} bg-main text-white min-h-screen`}
        suppressHydrationWarning
      >
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
