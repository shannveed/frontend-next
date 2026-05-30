// frontend-next/src/app/viewer-feedback/page.jsx
import ViewerFeedbackDashboardClient from '../../components/dashboard/ViewerFeedbackDashboardClient';

export const metadata = {
  title: 'Viewer Feedback Dashboard',
  robots: { index: false, follow: false },
};

export default function ViewerFeedbackPage() {
  return <ViewerFeedbackDashboardClient />;
}
