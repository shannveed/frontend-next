'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

import RequireAuth from '../auth/RequireAuth';
import SideBarShell from './SideBarShell';
import { apiFetch } from '../../lib/client/apiFetch';

export default function PasswordClient() {
  return (
    <RequireAuth>
      {(user) => <PasswordInner token={user.token} />}
    </RequireAuth>
  );
}

function PasswordInner({ token }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const inputClass =
    'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

  const submit = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword) return toast.error('All fields are required');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirm) return toast.error('Confirm password does not match');

    try {
      setSaving(true);

      const res = await apiFetch('/api/users/password', {
        method: 'PUT',
        token,
        body: { oldPassword, newPassword },
      });

      toast.success(res?.message || 'Password changed!');
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (e2) {
      toast.error(e2?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideBarShell>
      <h2 className="text-xl font-bold mb-6">Change Password</h2>

      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div>
          <label className="text-sm text-border font-semibold">Old Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label className="text-sm text-border font-semibold">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label className="text-sm text-border font-semibold">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold disabled:opacity-60"
        >
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </SideBarShell>
  );
}
