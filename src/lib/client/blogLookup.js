// frontend-next/src/lib/client/blogLookup.js
import { apiFetch } from './apiFetch';

export const findBlogPostsByTitlesAdmin = (
  token,
  titles = [],
  { mode = 'exact' } = {}
) =>
  apiFetch('/api/blog/admin/find-by-titles', {
    method: 'POST',
    token,
    body: { titles, mode },
  });
