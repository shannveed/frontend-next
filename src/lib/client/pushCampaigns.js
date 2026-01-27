import { apiFetch } from './apiFetch';

export const createPushCampaign = (token, payload) =>
  apiFetch('/api/push-campaigns', {
    method: 'POST',
    token,
    body: payload,
  });
