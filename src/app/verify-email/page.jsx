// frontend-next/src/app/verify-email/page.jsx
import VerifyEmailClient from '../../components/reward/VerifyEmailClient';

export const metadata = {
  title: 'Verify Email',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage({ searchParams }) {
  return <VerifyEmailClient token={searchParams?.token || ''} />;
}
