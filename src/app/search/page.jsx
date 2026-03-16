// frontend-next/src/app/search/page.jsx
import { permanentRedirect } from 'next/navigation';

export const metadata = {
  title: 'Search',
  robots: { index: false, follow: false },
};

export default function SearchRedirectPage() {
  permanentRedirect('/movies');
}
