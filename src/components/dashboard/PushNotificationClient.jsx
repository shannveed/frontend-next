'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';
import Uploader from '../common/Uploader';

import { getUsersAdmin } from '../../lib/client/adminUsers';
import { createPushCampaign } from '../../lib/client/pushCampaigns';

export default function PushNotificationClient() {
  return (
    <RequireAdmin>
      {(user) => <PushInner token={user.token} />}
    </RequireAdmin>
  );
}

function PushInner({ token }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const userList = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => !u.isAdmin) : []),
    [users]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getUsersAdmin(token);
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggleUser = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(userList.map((u) => u._id));
  const clearAll = () => setSelected([]);

  const handleSend = async () => {
    if (!title.trim()) return toast.error('Title is required');
    if (!selected.length) return toast.error('Select at least one user');

    try {
      setSending(true);

      await createPushCampaign(token, {
        title: title.trim(),
        message: message.trim(),
        link: link.trim(),
        imageUrl: imageUrl || '',
        userIds: selected,
        sendEmail: true,
        sendPush: true,
        sendInApp: true,
      });

      toast.success('Campaign sent');

      setTitle('');
      setMessage('');
      setLink('');
      setImageUrl('');
      setSelected([]);
    } catch (e) {
      toast.error(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <SideBarShell>
      <h2 className="text-xl font-bold mb-6">Push Notification</h2>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm text-border">Movie Heading</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-main border border-border rounded px-3 py-3 mt-2"
            placeholder="e.g. New Movie Added"
          />
        </div>

        <div>
          <label className="text-sm text-border">Movie Link</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full bg-main border border-border rounded px-3 py-3 mt-2"
            placeholder="https://www.moviefrost.com/movie/slug"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-border">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-main border border-border rounded px-3 py-3 mt-2 min-h-[110px]"
            placeholder="Short description..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-border">Thumbnail Image (R2 Upload)</label>
          <div className="mt-2">
            <Uploader setImageUrl={setImageUrl} />
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="thumbnail"
              className="mt-3 w-48 h-28 object-cover rounded border border-border"
            />
          ) : null}
        </div>
      </div>

      <div className="bg-dry border border-border rounded p-4 mt-6">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
          <h3 className="font-semibold">Select Users ({selected.length})</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-2 text-xs border border-customPurple rounded hover:bg-customPurple">
              Select All
            </button>
            <button onClick={clearAll} className="px-3 py-2 text-xs border border-border rounded hover:bg-main">
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
            {userList.map((u) => (
              <label
                key={u._id}
                className="flex items-center gap-3 p-2 rounded hover:bg-main cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(u._id)}
                  onChange={() => toggleUser(u._id)}
                  className="accent-customPurple"
                />
                <span className="text-sm">{u.fullName}</span>
                <span className="text-xs text-border ml-auto">{u.email}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="mt-6 bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold disabled:opacity-60"
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </SideBarShell>
  );
}
