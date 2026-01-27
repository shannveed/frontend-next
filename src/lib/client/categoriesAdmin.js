import { apiFetch } from './apiFetch';

export const createCategoryAdmin = (token, { title }) =>
  apiFetch('/api/categories', {
    method: 'POST',
    token,
    body: { title },
  });

export const updateCategoryAdmin = (token, id, { title }) =>
  apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: { title },
  });

export const deleteCategoryAdmin = (token, id) =>
  apiFetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
