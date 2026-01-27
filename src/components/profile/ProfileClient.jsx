// src/components/profile/ProfileClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import SideBarShell from '../dashboard/SideBarShell';
import Loader from '../common/Loader';
import Uploader from '../common/Uploader';

import { getUserInfo } from '../../lib/client/auth';
import { apiFetch } from '../../lib/client/apiFetch';

const isValidEmail = (email) => {
  const e = String(email || '').trim();
  // simple + safe
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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

  // Load from localStorage (same as CRA behavior)
  useEffect(() => {
    const ui = getUserInfo();

    if (!ui?.token) {
      // ProtectedRoute parity
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
        body: {
          fullName: name,
          email: em,
          image: image || '',
        },
      });

      // Backend returns updated user + token (same as CRA)
      try {
        localStorage.setItem('userInfo', JSON.stringify(updated));
        // trigger NavBar/SideBarShell listeners (they listen on "storage")
        window.dispatchEvent(new Event('storage'));
      } catch {}

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
        } catch {}
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

      await apiFetch('/api/users', {
        method: 'DELETE',
        token,
      });

      try {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('redirectAfterLogin');
        window.dispatchEvent(new Event('storage'));
      } catch {}

      toast.success('Profile Deleted');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err?.message || 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SideBarShell>
      <div className="flex flex-col gap-6">
        <div className="flex-btn">
          <h2 className="text-xl font-bold">Profile</h2>
        </div>

        {booting ? (
          <Loader />
        ) : (
          <form onSubmit={handleUpdate} className="flex flex-col gap-6">
            {/* Profile Image */}
            <div className="bg-main border border-border rounded-lg p-5">
              <p className="text-border font-semibold text-sm mb-3">
                Profile Image
              </p>

              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border border-border bg-dry">
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/profile-user.png';
                    }}
                  />
                </div>

                <div className="flex-1 w-full">
                  <Uploader
                    setImageUrl={setImage}
                    // Optional compression (same idea as CRA)
                    compression={{
                      targetSizeKB: 70,
                      maxWidth: 1024,
                      maxHeight: 1024,
                      mimeType: 'image/webp',
                    }}
                    buttonText="Upload"
                  />
                  <p className="text-xs text-dryGray mt-2">
                    Upload a square image for best results.
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="bg-main border border-border rounded-lg p-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-border text-sm font-semibold">
                    Full Name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-dry border border-border rounded px-3 py-3 mt-2 text-sm text-white outline-none focus:border-customPurple"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="text-border text-sm font-semibold">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-dry border border-border rounded px-3 py-3 mt-2 text-sm text-white outline-none focus:border-customPurple"
                    placeholder="you@example.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 transition text-white py-3 px-6 rounded font-semibold disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="w-full sm:w-auto bg-customPurple hover:bg-opacity-90 transition text-white py-3 px-8 rounded font-semibold disabled:opacity-60"
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </SideBarShell>
  );
}
