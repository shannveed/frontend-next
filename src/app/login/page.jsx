// src/app/login/page.jsx
import LoginClient from '../../components/auth/LoginClient';

export const metadata = {
  title: 'Login',
  description: 'Login to MovieFrost to save favorites, rate titles, and receive notifications.',
};

export default function Page() {
  return <LoginClient />;
}
