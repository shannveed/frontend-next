// frontend-next/src/components/actor/ActorPageClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import SafeImage from '../common/SafeImage';
import MovieCard from '../movie/MovieCard';
import ExpandableText from '../common/ExpandableText';
import VisibleBreadcrumbs from '../seo/VisibleBreadcrumbs';

import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const ROLE_LABELS = {
  actor: 'Actor',
  director: 'Director',
};

const clean = (value = '') => String(value ?? '').trim();

const formatDate = (value) => {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

function InfoRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="bg-main border border-border rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wide text-dryGray">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

function ExternalLinks({ actor }) {
  const links = [
    actor?.tmdbUrl ? { label: 'TMDb', href: actor.tmdbUrl } : null,
    actor?.imdbUrl ? { label: 'IMDb', href: actor.imdbUrl } : null,
    actor?.homepage ? { label: 'Official Website', href: actor.homepage } : null,
  ].filter(Boolean);

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {links.map((item) => (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded bg-main border border-border text-sm text-white hover:border-customPurple transition"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function KnownForTmdb({ items = [] }) {
  const list = Array.isArray(items) ? items.filter(Boolean).slice(0, 10) : [];
  if (!list.length) return null;

  return (
    <section className="bg-dry border border-border rounded-lg p-5 mt-6">
      <h2 className="text-white text-lg font-semibold">Known For on TMDb</h2>
      <p className="text-dryGray text-sm mt-1">
        Popular credits from TMDb for additional context.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {list.map((item) => (
          <div
            key={`${item.mediaType}-${item.tmdbId}`}
            className="bg-main border border-border rounded-lg overflow-hidden"
          >
            <div className="relative w-full aspect-[2/3] bg-black">
              <SafeImage
                src={item.posterImage}
                fallbackCandidates={['/images/MOVIEFROST.png']}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 50vw, 220px"
                className="object-cover"
              />
            </div>

            <div className="p-3">
              <p className="text-white text-sm font-semibold line-clamp-2">
                {item.title}
              </p>

              <p className="text-xs text-dryGray mt-1">
                {[item.year, item.mediaType === 'tv' ? 'TV' : 'Movie']
                  .filter(Boolean)
                  .join(' • ')}
              </p>

              {item.role ? (
                <p className="text-[11px] text-customPurple mt-1 line-clamp-1">
                  {item.role}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ActorPageClient({
  slug,
  initialActor,
  initialMovies = [],
  initialPage = 1,
  initialPages = 1,
  total = 0,
}) {
  const actor = initialActor || null;

  const [movies, setMovies] = useState(
    Array.isArray(initialMovies) ? initialMovies : []
  );

  const [page, setPage] = useState(Number(initialPage) || 1);
  const [pages, setPages] = useState(Number(initialPages) || 1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filter, setFilter] = useState('all'); // all | Movie | WebSeries
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMovies(Array.isArray(initialMovies) ? initialMovies : []);
    setPage(Number(initialPage) || 1);
    setPages(Number(initialPages) || 1);
    setLoadingMore(false);
    setFilter('all');
    setSearch('');
  }, [slug, initialMovies, initialPage, initialPages]);

  const roles = Array.isArray(actor?.roles) && actor.roles.length
    ? actor.roles
    : ['actor'];

  const roleLabel = actor?.roleLabel || roles.map((role) => ROLE_LABELS[role] || role).join(' • ');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (movies || []).filter((movie) => {
      if (filter !== 'all' && movie.type !== filter) return false;

      if (!term) return true;

      return String(movie?.name || '').toLowerCase().includes(term);
    });
  }, [movies, filter, search]);

  const hasVisibleMovies = filtered.length > 0;

  const loadMore = async () => {
    if (loadingMore) return;
    if (page >= pages) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const res = await fetch(
        `/api/actors/${encodeURIComponent(slug)}?page=${nextPage}&limit=24`,
        { cache: 'no-store' }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load more');
      }

      setMovies((prev) => {
        const map = new Map((prev || []).map((movie) => [String(movie._id), movie]));

        (data?.movies || []).forEach((movie) => {
          if (!movie?._id) return;
          map.set(String(movie._id), movie);
        });

        return Array.from(map.values());
      });

      setPage(Number(data?.page) || nextPage);
      setPages(Number(data?.pages) || pages);
    } catch (e) {
      toast.error(e?.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  if (!actor) return null;

  const birthday = formatDate(actor?.birthday);
  const deathday = formatDate(actor?.deathday);
  const alsoKnownAs = Array.isArray(actor?.alsoKnownAs)
    ? actor.alsoKnownAs.slice(0, 4).join(', ')
    : '';

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Movies', href: '/movies' },
          { label: actor?.name || 'Actor' },
        ]}
        className="mb-4"
      />

      <section className="bg-dry border border-border rounded-lg p-5 sm:p-6">
        <div className="grid md:grid-cols-[220px_minmax(0,1fr)] gap-6">
          <div>
            <div className="relative w-full max-w-[220px] mx-auto md:mx-0 aspect-[3/4] rounded-xl overflow-hidden border border-border bg-black">
              <SafeImage
                src={actor?.image || '/images/placeholder.jpg'}
                fallbackCandidates={['/images/placeholder.jpg']}
                alt={actor?.name || 'Actor'}
                fill
                priority
                fetchPriority="high"
                sizes="220px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
              {roleLabel}
            </p>

            <h1 className="text-2xl sm:text-4xl font-bold text-white mt-2 leading-tight">
              {actor?.name} Movies, Biography & Filmography
            </h1>

            <div className="flex flex-wrap gap-2 mt-4">
              {roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 rounded bg-main border border-border text-xs text-white"
                >
                  {ROLE_LABELS[role] || role}
                </span>
              ))}

              {actor?.knownForDepartment ? (
                <span className="px-3 py-1 rounded bg-customPurple/15 border border-customPurple text-xs text-white">
                  Known for {actor.knownForDepartment}
                </span>
              ) : null}

              <span className="px-3 py-1 rounded bg-main border border-border text-xs text-white">
                {Number(total || actor?.localCreditsCount || 0).toLocaleString()} MovieFrost credits
              </span>
            </div>

            <ExternalLinks actor={actor} />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              <InfoRow label="Birthday" value={birthday} />
              <InfoRow label="Deathday" value={deathday} />
              <InfoRow label="Birthplace" value={actor?.placeOfBirth} />
              <InfoRow label="Gender" value={actor?.gender} />
              <InfoRow label="Also known as" value={alsoKnownAs} />
              <InfoRow
                label="TMDb popularity"
                value={
                  Number(actor?.popularity || 0)
                    ? Number(actor.popularity).toFixed(1)
                    : ''
                }
              />
            </div>
          </div>
        </div>

        {actor?.biography ? (
          <div className="bg-main border border-border rounded-lg p-5 mt-6">
            <h2 className="text-white text-lg font-semibold mb-3">
              Biography
            </h2>

            <ExpandableText
              text={actor.biography}
              wordLimit={130}
              textClassName="text-text text-sm sm:text-base leading-8 whitespace-pre-line"
              buttonClassName="mt-3 text-customPurple hover:underline text-sm font-semibold"
              moreLabel="Read full biography"
              lessLabel="Show less"
            />
          </div>
        ) : (
          <div className="bg-main border border-border rounded-lg p-5 mt-6">
            <h2 className="text-white text-lg font-semibold mb-2">
              Biography
            </h2>

            <p className="text-text text-sm leading-7">
              Biography information is currently unavailable from TMDb. You can still browse related MovieFrost titles below.
            </p>
          </div>
        )}
      </section>

      <KnownForTmdb items={actor?.knownFor} />



      <section className="mt-8">
        <div className="bg-dry border border-border rounded-lg p-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {actor?.name} Movies & Web Series on MovieFrost
              </h2>

              <p className="text-dryGray text-sm mt-1">
                Browse local MovieFrost titles connected to this actor/director.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[420px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this filmography..."
                className="flex-1 bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple"
              >
                <option value="all">All</option>
                <option value="Movie">Movies</option>
                <option value="WebSeries">Web Series</option>
              </select>
            </div>
          </div>
        </div>

        {hasVisibleMovies ? (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-5 gap-4">
            {filtered.map((movie) => (
              <MovieCard key={movie._id} movie={movie} showLike />
            ))}
          </div>
        ) : (
          <div className="mt-6 bg-dry border border-border rounded-lg p-6">
            <p className="text-dryGray text-sm">
              No titles match your current filter.
            </p>
          </div>
        )}

        {page < pages ? (
          <div className="flex justify-center mt-10">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-customPurple hover:bg-opacity-90 transition text-white px-8 py-3 rounded font-semibold disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        ) : null}
      </section>

      {ADS_ENABLED && hasVisibleMovies ? (
        <div className="my-10">
          <EffectiveGateNativeBanner refreshKey={`actor-desktop-bottom-${slug}`} />
          <div className="sm:hidden mt-4">
            <EffectiveGateSquareAd refreshKey={`actor-mobile-bottom-${slug}`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
