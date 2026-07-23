// src/app/register/page.jsx
import RegisterClient from '../../components/auth/RegisterClient';

export const metadata = {
  title: 'Register',
  description: 'Create a free Flixmovo account.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RegisterClient />;
}
