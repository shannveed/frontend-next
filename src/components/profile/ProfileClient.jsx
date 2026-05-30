// frontend-next/src/components/profile/ProfileClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import SideBarShell from '../dashboard/SideBarShell';
import Loader from '../common/Loader';
import Uploader from '../common/Uploader';

import { EffectiveGateSquareAd } from '../ads/EffectiveGateNativeBanner';

import { getUserInfo } from '../../lib/client/auth';
import { apiFetch } from '../../lib/client/apiFetch';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const isValidEmail = (email) => {
  const e = String(email || '').trim();
  return /^.+@.+\..+$/.test(e);
};

export default function ProfileClient() {
  const [booting, setBooting] = useState(true);

  const [userInfo, setUserInfo] = useState(null);
  const token = userInfo?.token || null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const ui = getUserInfo();

    if (!ui?.token) {
      window.location.href = '/login';
      return;
    }

    setUserInfo(ui);
    setFullName(ui?.fullName || '');
    setEmail(ui?.email || '');
    setImage(ui?.image || '');
    setBooting(false);
  }, []);

  const avatarSrc = useMemo(() => {
    return image?.trim() ? image.trim() : '/images/placeholder.jpg';
  }, [image]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Please login again');
      window.location.href = '/login';
      return;
    }

    const name = fullName.trim();
    const em = email.trim();

    if (!name) return toast.error('Full name is required');
    if (!em) return toast.error('Email is required');
    if (!isValidEmail(em)) return toast.error('Please enter a valid email');

    try {
      setSaving(true);

      const updated = await apiFetch('/api/users', {
        method: 'PUT',
        token,
        body: { fullName: name, email: em, image: image || '' },
      });

      try {
        localStorage.setItem('userInfo', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      setUserInfo(updated);
      setFullName(updated?.fullName || name);
      setEmail(updated?.email || em);
      setImage(updated?.image || image);

      toast.success('Profile Updated');
    } catch (err) {
      const msg = err?.message || 'Failed to update profile';
      toast.error(msg);

      if (/not authorized/i.test(msg) || /token/i.test(msg)) {
        try {
          localStorage.removeItem('userInfo');
          window.dispatchEvent(new Event('storage'));
        } catch {
          // ignore
        }
        window.location.href = '/login';
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token) {
      toast.error('Please login again');
      window.location.href = '/login';
      return;
    }

    const ok = window.confirm('Are you sure you want to delete your profile?');
    if (!ok) return;

    try {
      setDeleting(true);

      await apiFetch('/api/users', { method: 'DELETE', token });

      try {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('redirectAfterLogin');
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      toast.success('Profile Deleted');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err?.message || 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SideBarShell showSidebarAd sidebarAdKey="profile">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold">Profile</h2>

        {booting ? (
          <Loader />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleUpdate}
                className="lg:col-span-2 bg-dry border border-border rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="shrink-0">
                    <p className="text-sm text-text mb-2">Profile Image</p>

                    <img
                      src={avatarSrc}
                      alt={fullName || 'Profile'}
                      className="w-28 h-28 rounded-full object-cover border border-border"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/placeholder.jpg';
                      }}
                    />

                    <div className="mt-4">
                      <Uploader
                        setImageUrl={setImage}
                        compression={{
                          targetSizeKB: 70,
                          maxWidth: 700,
                          maxHeight: 700,
                          mimeType: 'image/webp',
                        }}
                        buttonText="Upload"
                      />
                    </div>

                    <p className="text-xs text-text mt-2">
                      Upload a square image for best results.
                    </p>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <label className="block">
                      <span className="text-sm text-text">Full Name</span>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-dry border border-border rounded px-3 py-3 mt-2 text-sm text-white outline-none focus:border-customPurple"
                        placeholder="Your full name"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-text">Email</span>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-dry border border-border rounded px-3 py-3 mt-2 text-sm text-white outline-none focus:border-customPurple"
                        placeholder="you@example.com"
                        type="email"
                      />
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 transition text-white py-3 rounded font-semibold disabled:opacity-60"
                      >
                        {deleting ? 'Deleting...' : 'Delete Account'}
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold disabled:opacity-60"
                      >
                        {saving ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {ADS_ENABLED ? (
                <div className="lg:col-span-1">
                  <EffectiveGateSquareAd refreshKey="profile-square" />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </SideBarShell>
  );
}
