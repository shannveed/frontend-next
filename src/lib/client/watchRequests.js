import { apiFetch } from './apiFetch';

export const createWatchRequest = (token, title) =>
  apiFetch('/api/requests', {
    method: 'POST',
    token,
    body: { title },
  });

export const replyToWatchRequest = (token, requestId, { link, message }) =>
  apiFetch(`/api/requests/${encodeURIComponent(requestId)}/reply`, {
    method: 'POST',
    token,
    body: { link, message },
  });
