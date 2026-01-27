'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';

import { getCategoriesClient } from '../../lib/client/catalog';
import {
  createCategoryAdmin,
  deleteCategoryAdmin,
  updateCategoryAdmin,
} from '../../lib/client/categoriesAdmin';

export default function CategoriesClient() {
  return (
    <RequireAdmin>{(user) => <CategoriesInner token={user.token} />}</RequireAdmin>
  );
}

function CategoriesInner({ token }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getCategoriesClient();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setTitle(cat?.title || '');
    setModalOpen(true);
  };

  const save = async () => {
    const t = title.trim();
    if (!t) return toast.error('Category title is required');

    try {
      if (editing?._id) {
        await updateCategoryAdmin(token, editing._id, { title: t });
        toast.success('Category updated');
      } else {
        await createCategoryAdmin(token, { title: t });
        toast.success('Category created');
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.message || 'Save failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategoryAdmin(token, id);
      toast.success('Category deleted');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <SideBarShell>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Categories</h2>
        <button
          onClick={openCreate}
          className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
          type="button"
        >
          Create
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : categories.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead className="bg-main">
              <tr>
                <th className="text-left p-3 border-b border-border">Name</th>
                <th className="text-right p-3 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-dry">
              {categories.map((c) => (
                <tr key={c._id} className="border-b border-border/50">
                  <td className="p-3">{c.title}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="px-3 py-2 text-xs border border-border rounded hover:bg-main"
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(c._id)}
                      className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-border text-sm">No categories found.</p>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-dry border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? 'Update Category' : 'Create Category'}
            </h3>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Category name"
              className="w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={save}
                className="flex-1 bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold"
                type="button"
              >
                Save
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 border border-border hover:bg-main transition text-white py-3 rounded font-semibold"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </SideBarShell>
  );
}
