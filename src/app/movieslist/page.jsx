import MoviesListClient from '../../components/dashboard/MoviesListClient';

export const metadata = {
  title: 'Movies List',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MoviesListClient />;
}
