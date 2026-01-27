import { apiFetch } from './apiFetch';

export const getNotifications = (token, limit = 50) =>
  apiFetch(`/api/notifications?limit=${encodeURIComponent(limit)}`, { token });

export const markNotificationRead = (token, id) =>
  apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    token,
  });

export const deleteNotification = (token, id) =>
  apiFetch(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });

export const clearNotifications = (token) =>
  apiFetch(`/api/notifications`, { method: 'DELETE', token });
