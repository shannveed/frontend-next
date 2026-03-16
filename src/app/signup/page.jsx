// frontend-next/src/app/signup/page.jsx
import { permanentRedirect } from 'next/navigation';

export const metadata = {
  title: 'Sign Up',
  robots: { index: false, follow: false },
};

export default function SignupRedirectPage() {
  permanentRedirect('/register');
}
