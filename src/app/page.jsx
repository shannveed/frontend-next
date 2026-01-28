// frontend-next/src/app/page.jsx
import HomeClient from '../components/home/HomeClient';
import {
  getBannerMovies,
  getLatestNewMovies,
  getMovies,
  getTopRatedMovies,
} from '../lib/api';
import { SITE_URL } from '../lib/seo';

export const revalidate = 60;

// ✅ Canonical for homepage
export const metadata = {
  alternates: { canonical: `${SITE_URL}/` },
};

export default async function HomePage() {
  const [banner, latestNew, moviesPage1, topRated] = await Promise.all([
    getBannerMovies(10, { revalidate: 300 }).catch(() => []),
    getLatestNewMovies(100, { revalidate: 300 }).catch(() => []),
    getMovies({ pageNumber: 1 }, { revalidate: 60 }).catch(() => ({ movies: [] })),
    getTopRatedMovies({ revalidate: 600 }).catch(() => []),
  ]);

  return (
    <HomeClient
      initialBanner={Array.isArray(banner) ? banner : []}
      initialLatestNew={Array.isArray(latestNew) ? latestNew : []}
      initialLatestMovies={Array.isArray(moviesPage1?.movies) ? moviesPage1.movies : []}
      initialTopRated={Array.isArray(topRated) ? topRated : []}
    />
  );
}
