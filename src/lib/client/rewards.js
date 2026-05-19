// frontend-next/src/lib/client/rewards.js
import { apiFetch } from './apiFetch';
import { setCachedRewardFromSummary } from './rewardTracking';

export const getMyRewardStatus = async (token) => {
  const data = await apiFetch('/api/rewards/me', { token });

  if (data?.summary) {
    setCachedRewardFromSummary(data.summary);
  }

  return data;
};

export const claimReward = async (token, tier = 3) => {
  const data = await apiFetch('/api/rewards/claim', {
    method: 'POST',
    token,
    body: { tier },
  });

  if (data?.summary) {
    setCachedRewardFromSummary(data.summary);
  }

  return data;
};

export const applyReferral = async (token, { referralCode, deviceId }) => {
  const data = await apiFetch('/api/rewards/apply-referral', {
    method: 'POST',
    token,
    body: { referralCode, deviceId },
  });

  if (data?.summary) {
    setCachedRewardFromSummary(data.summary);
  }

  return data;
};

export const recordRewardActivity = async (
  token,
  { type = 'visit', movieId = '', seconds = 0 } = {}
) => {
  const data = await apiFetch('/api/rewards/activity', {
    method: 'POST',
    token,
    body: { type, movieId, seconds },
  });

  if (data?.summary) {
    setCachedRewardFromSummary(data.summary);
  }

  return data;
};

export const submitRewardFeedback = ({ name = '', email = '', message = '' }) =>
  apiFetch('/api/rewards/feedback', {
    method: 'POST',
    body: { name, email, message },
  });
