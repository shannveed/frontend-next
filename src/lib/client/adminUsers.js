import { apiFetch } from './apiFetch';

export const getUsersAdmin = (token) => apiFetch('/api/users', { token });

export const deleteUserAdmin = (token, id) =>
  apiFetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
