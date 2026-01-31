// frontend-next/src/lib/client/moviesLookup.js
import { apiFetch } from './apiFetch';

export const findMoviesByNamesAdmin = (
  token,
  names = [],
  { mode = 'exact', includeReviews = false } = {}
) =>
  apiFetch('/api/movies/admin/find-by-names', {
    method: 'POST',
    token,
    body: { names, mode, includeReviews },
  });
