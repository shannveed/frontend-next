// frontend-next/src/app/page.jsx
import HomeClient from '../components/home/HomeClient';
import HindiAnnouncementBanner from '../components/home/HindiAnnouncementBanner';
import JsonLd from '../components/seo/JsonLd';

import {
  getBannerMovies,
  getLatestMovies,
  getLatestNewMovies,
  getTopRatedMovies,
} from '../lib/api';

import { SITE_URL } from '../lib/seo';

import HomeBannerSectionPublic from '../components/home/HomeBannerSectionPublic';
import HomeTrendingSectionPublic from '../components/home/HomeTrendingSectionPublic';
import HomeLatestSectionPublic from '../components/home/HomeLatestSectionPublic';

/**
 * These constants must be initialized before metadata.
 *
 * metadata is evaluated immediately when this module is loaded. Referencing
 * a const declared later causes a temporal-dead-zone ReferenceError during
 * Next.js page-data collection.
 */
const HOME_TRENDING_LIMIT = 50;
const HOME_OG_IMAGE = `${SITE_URL}/og-image`;

export const revalidate = 60;

export const metadata = {
  title: {
    absolute: 'Watch Movies Online Free in HD | Flixmovo',
  },

  description:
    'Watch movies online free in HD on Flixmovo. Browse latest movies, web series, action, drama, comedy, thriller, romance, Hindi dubbed titles and more.',

  alternates: {
    canonical: `${SITE_URL}/`,
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: 'website',
    url: `${SITE_URL}/`,
    title: 'Watch Movies Online Free in HD | Flixmovo',
    description:
      'Watch movies online free in HD on Flixmovo. Discover trending movies, TV series, web series, Hollywood, Bollywood, Korean drama, anime and more.',
    images: [
      {
        url: HOME_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Flixmovo — Watch Movies and Web Series Online',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Watch Movies Online Free in HD | Flixmovo',
    description:
      'Watch movies online free in HD on Flixmovo. Browse trending movies, TV series, web series and more.',
    images: [HOME_OG_IMAGE],
  },
};

const homeJsonLd = {
  '@context': 'https://schema.org',

  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: 'Flixmovo',
      url: SITE_URL,

      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/FLIXMOVO.png`,
      },
    },

    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      name: 'Flixmovo',
      url: SITE_URL,
      publisher: {
        '@id': `${SITE_URL}#organization`,
      },

      potentialAction: {
        '@type': 'SearchAction',

        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/movies?search={search_term_string}`,
        },

        'query-input': 'required name=search_term_string',
      },
    },

    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: 'Watch Movies Online Free in HD | Flixmovo',
      description:
        'Watch movies online free in HD on Flixmovo. Discover trending movies, TV series, web series, Hollywood, Bollywood, Korean drama, anime and more.',

      isPartOf: {
        '@id': `${SITE_URL}#website`,
      },

      about: {
        '@id': `${SITE_URL}#organization`,
      },

      mainEntity: {
        '@id': `${SITE_URL}/#faq`,
      },
    },

    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,

      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Flixmovo?',

          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Flixmovo is an online movie and web series discovery platform where users can browse trending movies, TV series, genres, languages, industries and new releases in a clean HD-focused layout.',
          },
        },

        {
          '@type': 'Question',
          name: 'Can I watch movies online free in HD on Flixmovo?',

          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Flixmovo helps users find movie and web series pages with HD viewing options, multiple servers, metadata, cast information, trailers, ratings and related recommendations.',
          },
        },

        {
          '@type': 'Question',
          name: 'Does Flixmovo include web series and TV shows?',

          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Yes. Flixmovo includes movies, TV shows and web series across Hollywood, Bollywood, Korean drama, Japanese anime, Chinese drama, South Indian Hindi dubbed titles and more.',
          },
        },

        {
          '@type': 'Question',
          name: 'How can I find trending movies on Flixmovo?',

          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'The Flixmovo homepage highlights trending movies and TV series, while dedicated movie listing pages let users filter by type, genre, language, year, rating and film industry.',
          },
        },

        {
          '@type': 'Question',
          name: 'Why should I start from the Flixmovo homepage?',

          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'The homepage brings together trending titles, new releases, popular recommendations, industry-based browsing and helpful discovery sections so users can quickly decide what to watch next.',
          },
        },
      ],
    },
  ],
};

export default async function HomePage() {
  const [banner, latestNew, latestMovies, topRated] = await Promise.all([
    getBannerMovies(6, {
      revalidate: 300,
    }).catch(() => []),

    getLatestNewMovies(HOME_TRENDING_LIMIT, {
      revalidate: 300,
    }).catch(() => []),

    getLatestMovies({
      revalidate: 300,
    }).catch(() => []),

    getTopRatedMovies({
      revalidate: 600,
    }).catch(() => []),
  ]);

  const bannerList = Array.isArray(banner) ? banner : [];
  const latestNewList = Array.isArray(latestNew) ? latestNew : [];
  const latestMoviesList = Array.isArray(latestMovies) ? latestMovies : [];
  const topRatedList = Array.isArray(topRated) ? topRated : [];

  return (
    <>
      <JsonLd data={homeJsonLd} />

      <HindiAnnouncementBanner />

      <HomeClient
        initialBanner={bannerList}
        initialLatestNew={latestNewList}
        initialLatestMovies={latestMoviesList}
        initialTopRated={topRatedList}
        publicBannerNode={
          <HomeBannerSectionPublic
            bannerMovies={bannerList}
            latestMovies={latestMoviesList}
          />
        }
        publicTrendingNode={
          <HomeTrendingSectionPublic movies={latestNewList} />
        }
        publicLatestNode={
          <HomeLatestSectionPublic movies={latestMoviesList} />
        }
      />
    </>
  );
}
