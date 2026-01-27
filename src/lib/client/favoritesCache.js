// src/lib/client/favoritesCache.js
'use client';

import { FAVORITES_UPDATED_EVENT } from '../events';

const KEY = 'mf_favorite_ids';

const normalize = (ids = []) => {
  const clean = (ids || []).map((x) => String(x || '').trim()).filter(Boolean);
  return Array.from(new Set(clean)).sort();
};

export const getFavoriteIdsCache = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return normalize(Array.isArray(ids) ? ids : []);
  } catch {
    return [];
  }
};

export const setFavoriteIdsCache = (ids = []) => {
  if (typeof window === 'undefined') return;

  const next = normalize(ids);
  const prev = getFavoriteIdsCache();

  const same =
    prev.length === next.length && prev.every((v, i) => v === next[i]);

  if (same) return;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}

  // notify listeners (NavBar count + MovieCard liked state)
  try {
    window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
  } catch {}
};

export const addFavoriteIdToCache = (id) => {
  const next = [...getFavoriteIdsCache(), String(id || '')];
  setFavoriteIdsCache(next);
};

export const clearFavoriteIdsCache = () => setFavoriteIdsCache([]);

export const isFavoriteId = (id) => {
  const ids = getFavoriteIdsCache();
  return ids.includes(String(id || '').trim());
};
