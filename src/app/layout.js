// frontend-next/src/app/layout.js
import './globals.css';
import { Poppins } from 'next/font/google';

import { SITE_URL } from '../lib/seo';
import Providers from './providers';
import SiteChrome from '../components/layout/SiteChrome';

const SITE_NAME = 'Flixmovo';

const SITE_DESCRIPTION =
  'Watch free movies and web series online in HD on Flixmovo.';

const SITE_OG_IMAGE = `${SITE_URL}/og-image`;

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

const buildVerification = () => {
  const verification = {};
  const other = {};

  const google = String(
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''
  ).trim();

  const yandex = String(
    process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || ''
  ).trim();

  const bing = String(
    process.env.NEXT_PUBLIC_BING_VERIFICATION || ''
  ).trim();

  if (google) verification.google = google;
  if (yandex) verification.yandex = yandex;
  if (bing) other['msvalidate.01'] = bing;

  if (Object.keys(other).length) {
    verification.other = other;
  }

  return Object.keys(verification).length
    ? verification
    : undefined;
};

export const metadata = {
  metadataBase: new URL(SITE_URL),

  applicationName: SITE_NAME,

  title: {
    default: 'Flixmovo — Watch Free Movies & Web Series Online',
    template: '%s | Flixmovo',
  },

  description: SITE_DESCRIPTION,

  manifest: '/manifest.json',

  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        url: '/images/desktop-icon-512.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
    shortcut: [
      {
        url: '/favicon.ico',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/images/desktop-icon-192.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: 'Flixmovo — Watch Free Movies & Web Series Online',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Flixmovo — Watch Movies and Web Series Online',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Flixmovo — Watch Free Movies & Web Series Online',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Flixmovo — Watch Movies and Web Series Online',
      },
    ],
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
