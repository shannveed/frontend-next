// frontend-next/src/lib/client/websiteFeedback.js
import { apiFetch } from './apiFetch';

export const submitWebsiteFeedback = (payload) =>
  apiFetch('/api/feedback', {
    method: 'POST',
    body: payload,
  });

export const getWebsiteFeedbackAdmin = (token, query = {}) => {
  const params = new URLSearchParams();

  const set = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  };

  set('pageNumber', query.pageNumber || 1);
  set('limit', query.limit || 12);

  return apiFetch(`/api/feedback/admin?${params.toString()}`, {
    token,
  });
};
