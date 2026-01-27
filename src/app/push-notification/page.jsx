import PushNotificationClient from '../../components/dashboard/PushNotificationClient';

export const metadata = {
  title: 'Push Notification',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PushNotificationClient />;
}
