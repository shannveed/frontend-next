// frontend-next/src/app/actor/[slug]/page.jsx
import Link from 'next/link';
import { notFound } from 'next/navigation';

import ActorPageClient from '../../../components/actor/ActorPageClient';
import JsonLd from '../../../components/seo/JsonLd';

import { getActorBySlug } from '../../../lib/api';
import {
  absoluteUrl,
  buildActorGraphJsonLd,
  clean,
  SITE_URL,
  truncate,
} from '../../../lib/seo';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Actor pages are disabled by default.
 *
 * To enable visible actor pages later:
 * NEXT_PUBLIC_ACTOR_PAGES_ENABLED=true
 *
 * To keep them noindex even after enabling:
 * NEXT_PUBLIC_ACTOR_PAGES_NOINDEX=true
 *
 * Default behavior:
 * - unavailable to users through middleware as 410 Gone
 * - noindex
 */
const ACTOR_PAGES_ENABLED =
  String(process.env.NEXT_PUBLIC_ACTOR_PAGES_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';

const ACTOR_PAGES_NOINDEX =
  String(process.env.NEXT_PUBLIC_ACTOR_PAGES_NOINDEX ?? 'true')
    .trim()
    .toLowerCase() !== 'false';

const INITIAL_LIMIT = 20;
const INITIAL_SORT = 'latest';

const noindexNoFollowRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

const getActorRobots = () => {
  if (ACTOR_PAGES_NOINDEX) {
    return {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  };
};

const decodeParam = (value = '') => {
  try {
    return decodeURIComponent(String(value || '').trim());
  } catch {
    return String(value || '').trim();
  }
};

const buildActorCanonical = (actor, slug) =>
  `${SITE_URL}/actor/${clean(actor?.slug || slug)}`;

const buildActorTitle = (actor) => {
  const name = clean(actor?.name || 'Actor');
  const roleLabel = clean(actor?.roleLabel || actor?.knownForDepartment || 'Actor');

  return `${name} Movies, Biography, Career & ${roleLabel} Info | MovieFrost`;
};

const buildActorDescription = (actor) => {
  const name = clean(actor?.name || 'Actor');
  const roleLabel = clean(actor?.roleLabel || actor?.knownForDepartment || 'Actor');

  const base = `Explore ${name} biography, TMDb profile, career info, and MovieFrost movies/web series where ${name} appears as ${roleLabel.toLowerCase()}. Includes local titles plus TMDb discovery results.`;

  return truncate(base, 160);
};

function ActorUnavailablePage() {
  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <div className="mx-auto max-w-2xl bg-dry border border-border rounded-2xl p-6 sm:p-8 text-center">
        <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
          MovieFrost
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
          Actor pages are temporarily unavailable
        </h1>

        <p className="text-text text-sm sm:text-base leading-7 mt-4">
          We are improving actor and director profile pages. This section is
          temporarily unavailable, but movies and web series remain available.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            href="/movies"
            className="w-full sm:w-auto bg-customPurple hover:bg-opacity-90 transition text-white px-6 py-3 rounded-lg font-semibold"
          >
            Browse Movies
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto border border-border hover:border-customPurple hover:bg-main transition text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const slug = decodeParam(params?.slug);
  const canonical = `${SITE_URL}/actor/${clean(slug)}`;

  if (!ACTOR_PAGES_ENABLED) {
    return {
      title: {
        absolute: 'Actor pages temporarily unavailable | MovieFrost',
      },
      description:
        'MovieFrost actor profile pages are temporarily unavailable.',
      alternates: { canonical },
      robots: noindexNoFollowRobots,
    };
  }

  const data = await getActorBySlug(slug, {
    revalidate,
    page: 1,
    limit: INITIAL_LIMIT,
    sort: INITIAL_SORT,
  }).catch(() => null);

  if (!data?.actor) {
    return {
      title: 'Actor not found',
      robots: noindexNoFollowRobots,
    };
  }

  const actor = data.actor;
  const actorCanonical = buildActorCanonical(actor, slug);
  const title = buildActorTitle(actor);
  const description = buildActorDescription(actor);
  const image = absoluteUrl(actor?.image || '/images/placeholder.jpg');

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: actorCanonical },
    robots: getActorRobots(),
    openGraph: {
      type: 'profile',
      url: actorCanonical,
      title,
      description,
      images: image ? [image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ActorPage({ params }) {
  const slug = decodeParam(params?.slug);

  // Fallback safety. Middleware returns 410 before this page renders.
  if (!ACTOR_PAGES_ENABLED) {
    return <ActorUnavailablePage />;
  }

  const data = await getActorBySlug(slug, {
    revalidate,
    page: 1,
    limit: INITIAL_LIMIT,
    sort: INITIAL_SORT,
  }).catch(() => null);

  if (!data?.actor) notFound();

  const graph = ACTOR_PAGES_NOINDEX
    ? null
    : buildActorGraphJsonLd({
      actor: data.actor,
      movies: Array.isArray(data.movies)
        ? data.movies.filter((item) => !item?.isTmdbVirtual)
        : [],
    });

  return (
    <>
      <JsonLd data={graph} />

      <ActorPageClient
        slug={data.actor.slug || slug}
        initialActor={data.actor}
        initialMovies={Array.isArray(data.movies) ? data.movies : []}
        initialPage={Number(data.page || 1)}
        initialPages={Number(data.pages || 1)}
        initialTotal={Number(data.total || 0)}
        initialSort={data.sort || INITIAL_SORT}
        initialLimit={Number(data.limit || INITIAL_LIMIT)}
        localTotal={Number(data.localTotal || 0)}
        tmdbTotal={Number(data.tmdbTotal || 0)}
      />
    </>
  );
}
