// src/components/favorites/FavoritesClient.jsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import SideBarShell from '../dashboard/SideBarShell';
import Table from '../dashboard/Table';
import Loader from '../common/Loader';
import Empty from '../common/Empty';

import { EffectiveGateSquareAd } from '../ads/EffectiveGateNativeBanner';

import { getUserInfo } from '../../lib/client/auth';
import { clearFavorites, getFavorites } from '../../lib/client/users';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

export default function FavoritesClient() {
  const [userInfo, setUserInfo] = useState(null);

  const [likedMovies, setLikedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const loadFavorites = useCallback(async (token) => {
    try {
      setLoading(true);
      setError('');

      const data = await getFavorites(token);
      setLikedMovies(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.message || 'Failed to load favorites';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ui = getUserInfo();
    setUserInfo(ui);

    if (!ui?.token) {
      window.location.href = '/login';
      return;
    }

    loadFavorites(ui.token);
  }, [loadFavorites]);

  const deleteAll = async () => {
    if (!userInfo?.token) return;
    if (!window.confirm('Are you sure you want to delete all movies?')) return;

    try {
      setDeleting(true);
      await clearFavorites(userInfo.token);
      setLikedMovies([]);
      toast.success('Favorite Movies Deleted');
    } catch (e) {
      toast.error(e?.message || 'Failed to delete favorites');
    } finally {
      setDeleting(false);
    }
  };

  const downloadVideo = (url) => {
    if (!url) {
      toast.error('Download link not available');
      return;
    }

    try {
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', '');
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error('Download failed. Please try again later.');
    }
  };

  return (
    <SideBarShell showSidebarAd sidebarAdKey="favorites">
      <div className="flex-btn mb-6">
        <h2 className="text-xl font-bold">Favorites</h2>

        {likedMovies?.length > 0 && (
          <button
            onClick={deleteAll}
            disabled={deleting}
            className="bg-customPurple transitions text-white flex-rows gap-4 font-medium py-2 px-4 rounded-md disabled:opacity-60"
            type="button"
          >
            {deleting ? 'Deleting...' : 'Delete All'}
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : likedMovies?.length > 0 ? (
        <Table data={likedMovies} admin={false} downloadVideo={downloadVideo} />
      ) : (
        <Empty message="It seems like you don't have any favorite movies." />
      )}

      {/* ✅ Mobile 1:1 ad BELOW favorites list */}
      {ADS_ENABLED ? (
        <EffectiveGateSquareAd
          refreshKey="favorites-mobile-below-content"
          className="sm:hidden mt-6"
        />
      ) : null}
    </SideBarShell>
  );
}
