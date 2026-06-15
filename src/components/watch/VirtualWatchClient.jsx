// frontend-next/src/components/watch/VirtualWatchClient.jsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BiArrowBack } from 'react-icons/bi';
import { FaListUl, FaPlay } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import SafeImage from '../common/SafeImage';

import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

const clean = (value = '') => String(value ?? '').trim();

const normalizeSeasonNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

const groupEpisodesBySeason = (episodes = []) => {
  const map = new Map();

  for (const ep of episodes || []) {
    const season = normalizeSeasonNumber(ep?.seasonNumber);
    if (!map.has(season)) map.set(season, []);
    map.get(season).push(ep);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([seasonNumber, eps]) => ({
      seasonNumber,
      episodes: eps
        .slice()
        .sort(
          (a, b) =>
            Number(a?.episodeNumber || 0) - Number(b?.episodeNumber || 0)
        ),
    }));
};

const firstServerIndex = (servers = []) =>
  servers.findIndex((server) => String(server?.url || '').trim());

export default function VirtualWatchClient({ movie }) {
  const router = useRouter();

  const [play, setPlay] = useState(false);
  const [serverIndex, setServerIndex] = useState(0);

  const isSeries = movie?.type === 'WebSeries';

  const seasons = useMemo(
    () =>
      isSeries
        ? groupEpisodesBySeason(Array.isArray(movie?.episodes) ? movie.episodes : [])
        : [],
    [isSeries, movie]
  );

  const [activeSeason, setActiveSeason] = useState(
    seasons?.[0]?.seasonNumber || 1
  );

  const activeSeasonEpisodes = useMemo(() => {
    const season = seasons.find((item) => item.seasonNumber === activeSeason);
    return season?.episodes || [];
  }, [seasons, activeSeason]);

  const [episodeId, setEpisodeId] = useState(
    activeSeasonEpisodes?.[0]?._id || ''
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  const currentEpisode =
    activeSeasonEpisodes.find((ep) => String(ep?._id) === String(episodeId)) ||
    activeSeasonEpisodes[0] ||
    null;

  const servers = useMemo(() => {
    if (isSeries) {
      return [
        { label: 'Server 1', url: currentEpisode?.video || '' },
        { label: 'Server 2', url: currentEpisode?.videoUrl2 || '' },
        { label: 'Server 3', url: currentEpisode?.videoUrl3 || '' },
      ];
    }

    return [
      { label: 'Server 1', url: movie?.video || '' },
      { label: 'Server 2', url: movie?.videoUrl2 || '' },
      { label: 'Server 3', url: movie?.videoUrl3 || '' },
    ];
  }, [isSeries, movie, currentEpisode]);

  const activeVideoUrl =
    servers?.[serverIndex]?.url ||
    servers?.[firstServerIndex(servers)]?.url ||
    '';

  const selectEpisode = (ep) => {
    if (!ep) return;
    setEpisodeId(String(ep._id || ''));
    setPlay(false);
    setPickerOpen(false);
  };

  const handleSeasonChange = (value) => {
    const nextSeason = Number(value);
    setActiveSeason(nextSeason);

    const next = seasons.find((item) => item.seasonNumber === nextSeason);
    setEpisodeId(String(next?.episodes?.[0]?._id || ''));
    setPlay(false);
  };

  const handlePlay = () => {
    if (!activeVideoUrl) return;
    setPlay(true);
  };

  const description = clean(movie?.desc);

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/70"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-dry border-t border-border rounded-t-2xl p-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-white font-semibold">Select Episode</h3>

              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="w-10 h-10 flex-colo rounded-md bg-main border border-border text-white"
                aria-label="Close"
              >
                <IoClose />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[65vh]">
              {activeSeasonEpisodes.map((ep) => (
                <button
                  key={ep._id}
                  type="button"
                  onClick={() => selectEpisode(ep)}
                  className={`text-left p-3 rounded-lg border transitions ${String(ep._id) === String(currentEpisode?._id)
                      ? 'bg-customPurple border-customPurple text-white'
                      : 'bg-main border-border text-white hover:border-customPurple'
                    }`}
                >
                  <p className="text-sm font-semibold">
                    Episode {ep.episodeNumber}
                  </p>
                  <p className="text-xs text-dryGray mt-1 line-clamp-2">
                    {ep.title || 'Tap to play'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-dry p-6 mobile:p-4 mb-12 rounded-lg">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="sm:w-16 sm:h-16 w-10 h-10 flex-colo transitions hover:bg-customPurple rounded-md bg-main text-white flex-shrink-0"
            type="button"
            aria-label="Go back"
          >
            <BiArrowBack className="sm:text-2xl text-lg" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="sm:text-xl font-semibold truncate">
              {movie?.name}
              {movie?.year ? ` (${movie.year})` : ''}
            </h1>

            <p className="text-xs text-dryGray mt-1">
              {isSeries ? 'Web Series' : 'Movie'}
              {movie?.language ? ` • ${movie.language}` : ''}
              {movie?.category ? ` • ${movie.category}` : ''}
            </p>
          </div>

          <Link
            href={movie?.href || '/movies'}
            className="border border-border hover:border-customPurple rounded px-4 py-2 text-sm"
          >
            Details
          </Link>
        </div>

        {isSeries ? (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <select
                value={activeSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="flex-1 bg-main border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-customPurple"
              >
                {seasons.map((season) => (
                  <option key={season.seasonNumber} value={season.seasonNumber}>
                    Season {season.seasonNumber} ({season.episodes.length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-2 rounded bg-main border border-border text-white flex items-center gap-2"
              >
                <FaListUl />
                Episodes
              </button>
            </div>

            {currentEpisode ? (
              <p className="text-xs text-dryGray">
                Season {activeSeason} • Episode {currentEpisode.episodeNumber}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 mb-4">
          {servers.map((server, idx) => {
            const enabled = !!server.url;
            const active = idx === serverIndex;

            return (
              <button
                key={server.label}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setServerIndex(idx);
                  setPlay(false);
                }}
                className={`px-4 py-2 rounded-md font-medium border transitions ${active
                    ? 'bg-customPurple text-white border-customPurple'
                    : 'bg-dry text-white border-border hover:border-customPurple'
                  } ${enabled ? '' : 'opacity-50 cursor-not-allowed'}`}
              >
                {server.label}
              </button>
            );
          })}
        </div>

        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ paddingTop: '56.25%' }}
        >
          {play ? (
            <iframe
              key={`${movie?._id}:${serverIndex}:${activeVideoUrl}:${currentEpisode?._id || ''
                }`}
              title={`${movie?.name || 'Movie'} player`}
              src={activeVideoUrl}
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div className="absolute inset-0">
              <div className="w-full h-full rounded-lg overflow-hidden relative bg-main">
                <SafeImage
                  src={movie?.image}
                  fallbackCandidates={[movie?.titleImage, '/images/MOVIEFROST.png']}
                  alt={movie?.name || 'Movie'}
                  fill
                  priority
                  quality={75}
                  sizes="100vw"
                  className="object-cover"
                />

                <div className="absolute inset-0 flex-colo bg-black/45">
                  <button
                    onClick={handlePlay}
                    disabled={!activeVideoUrl}
                    className="bg-white text-customPurple flex-colo border border-customPurple rounded-full w-20 h-20 font-medium text-xl hover:bg-customPurple hover:text-white transitions disabled:opacity-50"
                    type="button"
                    aria-label="Play"
                  >
                    <FaPlay />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {description ? (
          <div className="mt-6 bg-main border border-border rounded-lg p-4">
            <h2 className="text-white font-semibold text-sm mb-2">
              About {movie?.name || 'this title'}
            </h2>

            <p className="text-text text-sm leading-7 whitespace-pre-line">
              {description}
            </p>
          </div>
        ) : null}

        <EffectiveGateNativeBanner
          refreshKey={`watch-tmdb-desktop-${movie?.tmdbType}-${movie?.tmdbId}`}
        />

        <EffectiveGateSquareAd
          refreshKey={`watch-tmdb-mobile-${movie?.tmdbType}-${movie?.tmdbId}`}
          className="sm:hidden"
        />
      </div>
    </div>
  );
}
