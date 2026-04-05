// src/app/login/page.jsx
import LoginWithGoogleProvider from '../../components/auth/LoginWithGoogleProvider';

export const metadata = {
  title: 'Login',
  description: 'Login to MovieFrost to save favorites, rate titles, and receive notifications.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LoginWithGoogleProvider />;
}
