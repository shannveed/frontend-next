'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';

import { deleteUserAdmin, getUsersAdmin } from '../../lib/client/adminUsers';

const shortId = (id) => String(id || '').slice(0, 8).toUpperCase();

export default function UsersClient() {
  return (
    <RequireAdmin>{(user) => <UsersInner token={user.token} />}</RequireAdmin>
  );
}

function UsersInner({ token }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getUsersAdmin(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const del = async (id, isAdmin) => {
    if (isAdmin) return toast.error("Can't delete admin user");
    if (!window.confirm('Delete this user?')) return;

    try {
      await deleteUserAdmin(token, id);
      toast.success('User deleted');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <SideBarShell>
      <h2 className="text-xl font-bold mb-6">Users</h2>

      {loading ? (
        <Loader />
      ) : users.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead className="bg-main">
              <tr>
                <th className="text-left p-3 border-b border-border">Id</th>
                <th className="text-left p-3 border-b border-border">Full Name</th>
                <th className="text-left p-3 border-b border-border">Email</th>
                <th className="text-left p-3 border-b border-border">Role</th>
                <th className="text-right p-3 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-dry">
              {users.map((u) => (
                <tr key={u._id} className="border-b border-border/50">
                  <td className="p-3">{shortId(u._id)}</td>
                  <td className="p-3">{u.fullName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.isAdmin ? 'Admin' : 'User'}</td>
                  <td className="p-3 text-right">
                    {!u.isAdmin ? (
                      <button
                        onClick={() => del(u._id, u.isAdmin)}
                        className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        type="button"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-dryGray">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-border text-sm">No users found.</p>
      )}
    </SideBarShell>
  );
}
