import DashboardClient from '../../components/dashboard/DashboardClient';

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DashboardClient />;
}
