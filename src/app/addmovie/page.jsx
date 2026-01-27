import MovieEditorClient from '../../components/dashboard/MovieEditorClient';

export const metadata = {
  title: 'Add Movie',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MovieEditorClient mode="create" />;
}
