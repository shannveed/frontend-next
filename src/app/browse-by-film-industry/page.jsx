// frontend-next/src/app/browse-by-film-industry/page.jsx
import HomeBrowseContentPublic from '../../components/home/HomeBrowseContentPublic';
import SeoLandingHero from '../../components/movies/SeoLandingHero';
import VisibleBreadcrumbs from '../../components/seo/VisibleBreadcrumbs';

import { getTopRatedMovies } from '../../lib/api';
import { SITE_URL } from '../../lib/seo';

export const revalidate = 300;

export const metadata = {
  title: {
    absolute: 'Browse By Film Industry - Movies & Web Series | MovieFrost',
  },
  description:
    'Browse movies and web series by film industry on MovieFrost. Explore Hollywood, Bollywood, Korean drama, Japanese anime, Chinese drama, South Indian Hindi dubbed movies, Punjabi movies and more.',
  alternates: { canonical: `${SITE_URL}/browse-by-film-industry` },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/browse-by-film-industry`,
    title: 'Browse By Film Industry - Movies & Web Series | MovieFrost',
    description:
      'Browse Hollywood, Bollywood, Korean drama, Japanese anime, Chinese drama, South Indian Hindi dubbed movies, Punjabi movies and more on MovieFrost.',
    images: [`${SITE_URL}/images/MOVIEFROST.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse By Film Industry - Movies & Web Series | MovieFrost',
    description:
      'Browse movies and web series by film industry on MovieFrost.',
    images: [`${SITE_URL}/images/MOVIEFROST.png`],
  },
};

export default async function BrowseByFilmIndustryPage() {
  const topRated = await getTopRatedMovies({ revalidate: 600 }).catch(() => []);
  const topRatedList = Array.isArray(topRated) ? topRated : [];

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Browse By Film Industry' },
        ]}
        className="mb-4"
      />

      <SeoLandingHero
        contained={false}
        eyebrow="Browse By Film Industry"
        title="Browse Movies and TV Series by Film Industry"
        description="Explore MovieFrost collections by film industry and content style. Browse Hollywood English movies, Hollywood Hindi dubbed movies, Bollywood movies, Bollywood web series, Korean drama, Korean Hindi dubbed titles, Chinese drama, Japanese anime, Japanese movies, South Indian Hindi dubbed movies, Punjabi movies and more."
        chips={[
          'Hollywood',
          'Bollywood',
          'Korean Drama',
          'Japanese Anime',
          'Hindi Dubbed',
          'Web Series',
        ]}
      />

      <div className="mt-8">
        <HomeBrowseContentPublic topRated={topRatedList} />
      </div>
    </div>
  );
}
