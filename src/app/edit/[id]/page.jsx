import MovieEditorClient from '../../../components/dashboard/MovieEditorClient';

export const metadata = {
  title: 'Edit Movie',
  robots: { index: false, follow: false },
};

export default function Page({ params }) {
  return <MovieEditorClient mode="edit" movieId={params.id} />;
}
