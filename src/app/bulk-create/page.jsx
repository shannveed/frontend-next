import BulkCreateClient from '../../components/dashboard/BulkCreateClient';

export const metadata = {
  title: 'Bulk Create',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BulkCreateClient />;
}
