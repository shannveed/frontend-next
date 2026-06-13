// frontend-next/src/components/movie/ImportTmdbTitleButton.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { getUserInfo } from '../../lib/client/auth';
import { importTmdbTitleAdmin } from '../../lib/client/moviesAdmin';

const normalizeTmdbType = (value = '') => {
  const raw = String(value || '').trim().toLowerCase();

  if (raw === 'movie') return 'movie';
  if (raw === 'tv') return 'tv';

  return '';
};

export default function ImportTmdbTitleButton({
  tmdbType,
  tmdbId,
  movieName = '',
}) {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUserInfo(getUserInfo());

    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!userInfo?.isAdmin || !userInfo?.token) return null;

  const safeType = normalizeTmdbType(tmdbType);
  const safeId = Number(tmdbId);

  if (!safeType || !Number.isFinite(safeId) || safeId <= 0) return null;

  const doImport = async () => {
    try {
      setLoading(true);

      const data = await importTmdbTitleAdmin(userInfo.token, {
        tmdbType: safeType,
        tmdbId: safeId,

        // Recommended workflow:
        // import as draft -> edit category/browseBy/images/SEO/episodes -> publish.
        isPublished,

        // Keep false unless you intentionally want TMDb votes as local rating.
        importTmdbVoteAsLocalRating: false,

        // Keep false to avoid duplicate local copies.
        allowDuplicate: false,
      });

      const editHref =
        data?.editHref ||
        (data?.movie?.slug
          ? `/edit/${data.movie.slug}`
          : data?.movie?._id
            ? `/edit/${data.movie._id}`
            : '');

      if (data?.imported) {
        toast.success('Imported into MongoDB');
      } else {
        toast.success('Already exists locally');
      }

      if (editHref) {
        router.push(editHref);
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to import TMDb title');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-customPurple/70 bg-dry p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-customPurple">
            Admin TMDb Import
          </p>

          <h2 className="mt-1 text-lg font-bold text-white">
            Convert this virtual TMDb title into a real MovieFrost title
          </h2>

          {movieName ? (
            <p className="mt-2 text-sm text-dryGray">
              Selected title:{' '}
              <span className="font-semibold text-white">{movieName}</span>
            </p>
          ) : null}

          <p className="mt-2 text-sm leading-6 text-dryGray">
            This will save only this selected TMDb title into your MongoDB movies
            collection. It will not import all TMDb virtual results.
          </p>

          <label className="mt-4 flex items-start gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="mt-1 accent-customPurple"
              disabled={loading}
            />

            <span>
              Publish immediately
              <span className="mt-1 block text-xs leading-5 text-dryGray">
                Recommended: keep unchecked, import as draft, edit category,
                browseBy, servers, images, SEO, and then publish.
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={doImport}
          disabled={loading}
          className="shrink-0 rounded-lg bg-customPurple px-5 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:opacity-60"
        >
          {loading ? 'Importing...' : 'Import & Edit'}
        </button>
      </div>
    </section>
  );
}
