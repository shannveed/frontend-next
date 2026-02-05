// frontend-next/src/app/actor/[slug]/page.jsx
import { cache } from 'react';
import { notFound } from 'next/navigation';

import { getActorBySlug } from '../../../lib/api';
import {
  buildActorGraphJsonLd,
  actorCanonicalBySlug,
} from '../../../lib/seo';
import JsonLd from '../../../components/seo/JsonLd';

import ActorPageClient from '../../../components/actor/ActorPageClient';

const getActor = cache((slug) => getActorBySlug(slug, { revalidate: 3600 }));

export async function generateMetadata({ params }) {
  const data = await getActor(params.slug);

  if (!data?.actor?.name) {
    return { title: 'Actor not found', robots: { index: false, follow: false } };
  }

  const canonical = actorCanonicalBySlug(params.slug);
  const name = data.actor.name;

  return {
    title: `${name} — Movies & Web Series`,
    description: `Browse movies and web series featuring ${name} on MovieFrost.`,
    alternates: { canonical },

    // ✅ IMPORTANT: /actor pages should NOT be indexed
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },

    openGraph: {
      type: 'profile',
      url: canonical,
      title: `${name} — Movies & Web Series`,
      description: `Browse movies and web series featuring ${name} on MovieFrost.`,
      images: data.actor.image ? [data.actor.image] : [],
    },
  };
}

export default async function ActorPage({ params }) {
  const data = await getActor(params.slug);

  if (!data?.actor?.name) notFound();

  const graphLd = buildActorGraphJsonLd({
    actor: data.actor,
    movies: data.movies || [],
  });

  return (
    <>
      <JsonLd data={graphLd} />
      <ActorPageClient
        slug={params.slug}
        initialActor={data.actor}
        initialMovies={data.movies || []}
        initialPage={data.page || 1}
        initialPages={data.pages || 1}
        total={data.total || 0}
      />
    </>
  );
}
