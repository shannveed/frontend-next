// frontend-next/src/app/reward/page.jsx
import RewardPageClient from '../../components/reward/RewardPageClient';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'Reward',
  description:
    'Invite friends to MovieFrost and earn ad-free streaming rewards. 3 friends = 1 week, 10 friends = 1 month.',
  alternates: { canonical: `${SITE_URL}/reward` },
  robots: { index: true, follow: true },
};

export default function RewardPage() {
  return <RewardPageClient />;
}
