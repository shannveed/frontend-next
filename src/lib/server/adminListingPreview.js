// frontend-next/src/lib/server/adminListingPreview.js
import 'server-only';

import { cookies } from 'next/headers';
import { getMoviesAdminServer, hasListingPageContent } from '../api';

export const getAdminPreviewToken = () => {
  try {
    return cookies().get('mf_token')?.value || null;
  } catch {
    return null;
  }
};

export async function resolveListingPageForRequest(publicData, query = {}) {
  const pageNumber = Number(query?.pageNumber || 1) || 1;

  // Public page exists => keep fast public behavior
  if (hasListingPageContent(publicData, pageNumber)) {
    return { data: publicData, source: 'public' };
  }

  // Public page does NOT exist => try admin preview via SSR cookie
  const token = getAdminPreviewToken();
  if (!token) {
    return { data: publicData, source: 'public' };
  }

  const adminData = await getMoviesAdminServer(query, token).catch(() => null);

  if (hasListingPageContent(adminData, pageNumber)) {
    return { data: adminData, source: 'admin' };
  }

  return { data: publicData, source: 'public' };
}
