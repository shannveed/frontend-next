// src/lib/client/users.js
import { apiFetch } from './apiFetch';
import {
  addFavoriteIdToCache,
  clearFavoriteIdsCache,
  setFavoriteIdsCache,
} from './favoritesCache';

export const getFavorites = async (token) => {
  const data = await apiFetch('/api/users/favorites', { token });

  // keep cache updated (so MovieCard can show "liked" state)
  const ids = Array.isArray(data)
    ? data.map((m) => String(m?._id || '')).filter(Boolean)
    : [];

  setFavoriteIdsCache(ids);

  return data;
};

export const likeMovie = async (token, { movieId }) => {
  const data = await apiFetch('/api/users/favorites', {
    method: 'POST',
    token,
    body: { movieId },
  });

  // optimistic cache update
  addFavoriteIdToCache(movieId);

  return data;
};

// delete all favorites
export const clearFavorites = async (token) => {
  const data = await apiFetch('/api/users/favorites', {
    method: 'DELETE',
    token,
  });

  clearFavoriteIdsCache();

  return data;
};
