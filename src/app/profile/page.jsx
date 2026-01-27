// src/app/profile/page.jsx
import ProfileClient from '../../components/profile/ProfileClient';

export const metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
