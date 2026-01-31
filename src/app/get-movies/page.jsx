// frontend-next/src/app/get-movies/page.jsx
import GetMoviesClient from '../../components/dashboard/GetMoviesClient';

export const metadata = {
  title: 'Get Movies',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GetMoviesClient />;
}
