// frontend-next/src/components/blog/BlogSectionBlock.jsx
import Link from 'next/link';
import { FaPlay } from 'react-icons/fa';
import SafeImage from '../common/SafeImage';

const trim = (value = '') => String(value ?? '').trim();
const isExternalUrl = (url = '') => /^https?:\/\//i.test(trim(url));

function MovieLinkCard({ title, url }) {
  const safeTitle = trim(title);
  const safeUrl = trim(url);

  if (!safeTitle || !safeUrl) return null;

  const content = (
    <div className="mt-5 overflow-hidden rounded-2xl border border-customPurple/35 bg-gradient-to-r from-main via-[#0d1435] to-main">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-customPurple font-semibold">
            Related Movie Link
          </p>
          <h3 className="text-white font-semibold text-base sm:text-lg mt-1 line-clamp-2">
            {safeTitle}
          </h3>
          <p className="text-dryGray text-sm mt-1">
            Open this movie page for more details and watching options.
          </p>
        </div>

        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-customPurple px-4 py-3 text-sm font-semibold text-white">
          Open Movie
          <FaPlay className="text-xs" />
        </span>
      </div>
    </div>
  );

  if (isExternalUrl(safeUrl)) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-95 transitions"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={safeUrl} className="block hover:opacity-95 transitions">
      {content}
    </Link>
  );
}

export default function BlogSectionBlock({
  section,
  sectionId,
  postTitle = '',
}) {
  const heading = trim(section?.heading);
  const body = trim(section?.body);
  const image = trim(section?.image);
  const imageAlt =
    trim(section?.imageAlt) ||
    heading ||
    trim(postTitle) ||
    'Blog section image';

  if (!heading || !body) return null;

  return (
    <section id={sectionId} className="scroll-mt-24">
      <h2 className="text-white text-xl font-semibold">{heading}</h2>

      {image ? (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-main mt-4">
          <SafeImage
            src={image}
            fallbackCandidates={['/images/MOVIEFROST.png']}
            alt={imageAlt}
            fill
            sizes="(max-width: 1280px) 100vw, 900px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-4 text-text text-sm sm:text-base leading-8 whitespace-pre-line">
        {body}
      </div>

      <MovieLinkCard
        title={section?.movieLinkText}
        url={section?.movieLinkUrl}
      />
    </section>
  );
}
