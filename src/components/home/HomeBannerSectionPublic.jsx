// src/components/home/HomeBannerSectionPublic.jsx
import BannerSlider from './BannerSlider';

export default function HomeBannerSectionPublic({
  bannerMovies = [],
  latestMovies = [],
}) {
  const curated = Array.isArray(bannerMovies) ? bannerMovies : [];
  const fallback = Array.isArray(latestMovies) ? latestMovies : [];

  const bannerFeed = curated.length > 0 ? curated : fallback;

  return <BannerSlider movies={bannerFeed} />;
}
