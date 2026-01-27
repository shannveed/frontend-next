// src/lib/client/ratings.js
import { apiFetch } from './apiFetch';

const enc = (v) => encodeURIComponent(String(v || '').trim());

export const getMovieRatings = (idOrSlug, limit = 20, page = 1) => {
  const safe = enc(idOrSlug);
  return apiFetch(
    `/api/movies/${safe}/ratings?limit=${encodeURIComponent(limit)}&page=${encodeURIComponent(page)}`
  );
};

export const getMyMovieRating = (token, idOrSlug) => {
  const safe = enc(idOrSlug);
  return apiFetch(`/api/movies/${safe}/ratings/me`, { token });
};

export const upsertMovieRating = (token, idOrSlug, rating, comment = '') => {
  const safe = enc(idOrSlug);

  return apiFetch(`/api/movies/${safe}/ratings`, {
    method: 'POST',
    token,
    body: {
      rating,
      comment,
    },
  });
};
