// frontend-next/src/app/feedback/page.jsx
import PublicWebsiteFeedbackPageClient from '../../components/pages/PublicWebsiteFeedbackPageClient';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'Help Improve MovieFrost',
  description:
    'Share your feedback to help us improve MovieFrost speed, streaming quality, content discovery, and overall user experience.',
  alternates: { canonical: `${SITE_URL}/feedback` },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function FeedbackPage() {
  return <PublicWebsiteFeedbackPageClient />;
}
