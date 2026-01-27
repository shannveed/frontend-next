import UsersClient from '../../components/dashboard/UsersClient';

export const metadata = {
  title: 'Users',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <UsersClient />;
}
