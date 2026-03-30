// frontend-next/src/lib/client/blogAdmin.js
import { apiFetch } from './apiFetch';

const buildAdminBlogQuery = (query = {}) => {
  const params = new URLSearchParams();

  const set = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  };

  set('pageNumber', query.pageNumber || 1);
  set('limit', query.limit);
  set('categorySlug', query.categorySlug);
  set('templateType', query.templateType);
  set('search', query.search);
  set('trending', query.trending);
  set('isPublished', query.isPublished);

  return params.toString();
};

export const getBlogPostsAdmin = (token, query = {}) =>
  apiFetch(`/api/blog/admin?${buildAdminBlogQuery(query)}`, { token });

export const getBlogPostAdmin = (token, id) =>
  apiFetch(`/api/blog/admin/${encodeURIComponent(String(id || '').trim())}`, {
    token,
  });

export const createBlogPostAdmin = (token, payload) =>
  apiFetch('/api/blog', {
    method: 'POST',
    token,
    body: payload,
  });

export const bulkCreateBlogPostsAdmin = (token, posts = []) =>
  apiFetch('/api/blog/admin/bulk', {
    method: 'POST',
    token,
    body: { posts },
  });

export const updateBlogPostAdmin = (token, id, payload) =>
  apiFetch(`/api/blog/${encodeURIComponent(String(id || '').trim())}`, {
    method: 'PUT',
    token,
    body: payload,
  });

export const deleteBlogPostAdmin = (token, id) =>
  apiFetch(`/api/blog/${encodeURIComponent(String(id || '').trim())}`, {
    method: 'DELETE',
    token,
  });
