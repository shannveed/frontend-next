// frontend-next/src/app/layout.js
import './globals.css';
import { Poppins } from 'next/font/google';
import { SITE_URL } from '../lib/seo';

import Providers from './providers';
import SiteChrome from '../components/layout/SiteChrome';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

const SITE_LANG = process.env.NEXT_PUBLIC_SITE_LANG || 'en';
const SITE_DIR = process.env.NEXT_PUBLIC_SITE_DIR || 'ltr';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'MovieFrost';

const SITE_TITLE =
  process.env.NEXT_PUBLIC_SITE_TITLE ||
  'MovieFrost — Watch Free Movies & Web Series Online';

const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  'Watch free movies and web series online in HD on MovieFrost.';

const buildVerification = () => {
  const v = {};
  const other = {};

  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;
  const bing = process.env.NEXT_PUBLIC_BING_VERIFICATION;

  if (google) v.google = google;
  if (yandex) v.yandex = yandex;
  if (bing) other['msvalidate.01'] = bing;

  if (Object.keys(other).length) v.other = other;

  return Object.keys(v).length ? v : undefined;
};

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  manifest: '/manifest.json',

  icons: {
    icon: [{ url: '/images/favicon1.png', type: 'image/png' }],
    shortcut: ['/images/favicon1.png'],
    apple: [{ url: '/images/MOVIEFROST.png', type: 'image/png' }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
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
    <html lang={SITE_LANG} dir={SITE_DIR} suppressHydrationWarning>
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
