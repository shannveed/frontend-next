import CategoriesClient from '../../components/dashboard/CategoriesClient';

export const metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CategoriesClient />;
}
