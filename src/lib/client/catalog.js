import { apiFetch } from './apiFetch';

export const getCategoriesClient = () => apiFetch('/api/categories');

export const getBrowseByDistinctClient = () =>
  apiFetch('/api/movies/browseBy-distinct');
