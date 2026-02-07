// frontend-next/src/components/movie/MovieTrailerSection.jsx
import React from 'react';

const safeTrim = (v) => String(v ?? '').trim();

const tryGetYoutubeId = (url) => {
  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || '';
    }

    // youtube.com/watch?v=<id>
    if (u.hostname.includes('youtube.com') || u.hostname.includes('m.youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;

      // /embed/<id> or /shorts/<id>
      const parts = u.pathname.split('/').filter(Boolean);
      const embedIdx = parts.indexOf('embed');
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];

      const shortsIdx = parts.indexOf('shorts');
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    // ignore
  }
  return '';
};

const tryGetVimeoId = (url) => {
  try {
    const u = new URL(url);

    if (u.hostname.includes('vimeo.com')) {
      // vimeo.com/<id> or player.vimeo.com/video/<id>
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || '';
      if (/^\d+$/.test(last)) return last;
    }
  } catch {
    // ignore
  }
  return '';
};

const toEmbedUrl = (rawUrl) => {
  const url = safeTrim(rawUrl);
  if (!url) return '';

  const yt = tryGetYoutubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`;

  const vimeo = tryGetVimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;

  // If admin already stored an embed URL or any other provider iframe URL:
  return url;
};

const isDirectVideoFile = (rawUrl) => {
  const url = safeTrim(rawUrl);
  if (!url) return false;

  try {
    const u = new URL(url);
    return /\.(mp4|webm|ogg)$/i.test(u.pathname);
  } catch {
    return /\.(mp4|webm|ogg)$/i.test(url);
  }
};

export default function MovieTrailerSection({ movie }) {
  const trailerUrl = safeTrim(movie?.trailerUrl);

  // ✅ Only show if available
  if (!trailerUrl) return null;

  const embedUrl = toEmbedUrl(trailerUrl);
  const directVideo = isDirectVideoFile(trailerUrl);

  return (
    <section className="my-16 bg-dry border border-border rounded-lg p-6 sm:p-8">
      <h2 className="text-white text-lg sm:text-xl font-semibold mb-4">
        Trailer
      </h2>

      <div
        className="w-full rounded-lg overflow-hidden border border-border bg-black"
        style={{ aspectRatio: '16 / 9' }}
      >
        {directVideo ? (
          <video
            src={trailerUrl}
            controls
            className="w-full h-full"
            preload="metadata"
          />
        ) : (
          <iframe
            src={embedUrl}
            title={`Trailer - ${movie?.name || 'Movie'}`}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>

      <p className="text-xs text-dryGray mt-2">
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-customPurple hover:underline"
        >
          Open trailer in new tab
        </a>
      </p>
    </section>
  );
}
