// frontend-next/src/app/actor/[slug]/page.jsx
import { notFound } from 'next/navigation';

import ActorPageClient from '../../../components/actor/ActorPageClient';
import JsonLd from '../../../components/seo/JsonLd';

import { getActorBySlug } from '../../../lib/api';
import { actorCanonicalBySlug, buildActorGraphJsonLd } from '../../../lib/seo';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const data = await getActorBySlug(params.slug, { revalidate });

  if (!data?.actor) {
    return {
      title: 'Actor not found',
      robots: { index: false, follow: false },
    };
  }

  const actorName = String(data.actor?.name || 'Actor').trim();

  return {
    title: `${actorName} — Movies & Web Series`,
    description: `Browse ${actorName} movies and web series on MovieFrost.`,
    alternates: {
      canonical: actorCanonicalBySlug(params.slug),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ActorPage({ params }) {
  const data = await getActorBySlug(params.slug, { revalidate });

  if (!data?.actor) notFound();

  const actor = data.actor;
  const movies = Array.isArray(data.movies) ? data.movies : [];

  const graph = buildActorGraphJsonLd({
    actor,
    movies,
  });

  return (
    <>
      <JsonLd data={graph} />

      <ActorPageClient
        slug={params.slug}
        initialActor={actor}
        initialMovies={movies}
        initialPage={Number(data.page) || 1}
        initialPages={Number(data.pages) || 1}
        total={Number(data.total) || movies.length}
      />
    </>
  );
}
