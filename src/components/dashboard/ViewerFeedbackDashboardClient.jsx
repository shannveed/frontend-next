// frontend-next/src/components/dashboard/ViewerFeedbackDashboardClient.jsx
'use client';

import React from 'react';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import AdminWebsiteFeedbackPanel from '../profile/AdminWebsiteFeedbackPanel';

export default function ViewerFeedbackDashboardClient() {
  return (
    <RequireAdmin>
      {(user) => (
        <SideBarShell>
          <AdminWebsiteFeedbackPanel token={user.token} />
        </SideBarShell>
      )}
    </RequireAdmin>
  );
}
