import { redirect } from 'next/navigation';

export default function MoviesSearchRedirect({ params }) {
  const term = encodeURIComponent(String(params?.search || '').trim());
  redirect(`/movies?search=${term}`);
}
