// src/components/home/HomeBrowseContentPublic.jsx
import BrowseSwiperSection from './BrowseSwiperSection';
import Promos from './Promos';

import MovieCard from '../movie/MovieCard';
import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

export default function HomeBrowseContentPublic({ topRated = [] }) {
  const topRatedList = Array.isArray(topRated) ? topRated.filter(Boolean).slice(0, 10) : [];

  return (
    <>
      <BrowseSwiperSection
        title="Hollywood"
        browseByValues={[
          'British (English)',
          'Hollywood (English)',
          'Hollywood Web Series (English)',
        ]}
      />

      <BrowseSwiperSection
        title="Hollywood Hindi"
        browseByValues={[
          'Hollywood (Hindi Dubbed)',
          'Hollywood Web Series (Hindi Dubbed)',
          'Hollywood( Hindi Dubbed)',
        ]}
      />

      <BrowseSwiperSection
        title="Bollywood"
        browseByValues={[
          'Bollywood (Hindi)',
          'Bollywood Web Series (Hindi)',
          'Bollywood Web Series',
        ]}
      />

      <BrowseSwiperSection
        title="Korean Drama"
        browseByValues={['Korean Drama (Korean)']}
      />

      <BrowseSwiperSection
        title="Korean"
        browseByValues={['Korean (English)']}
      />

      <BrowseSwiperSection
        title="Korean Hindi"
        browseByValues={['Korean (Hindi Dubbed)']}
      />

      <BrowseSwiperSection
        title="Chinese Drama"
        browseByValues={['Chinease Drama']}
      />

      <BrowseSwiperSection
        title="Japanese"
        browseByValues={[
          'Japanese (Movies)',
          'Japanese Web Series',
          'Japanese Web Series (Hindi)',
        ]}
        excludeBrowseByValues={['Japanese Web Series (Hindi)']}
      />

      <BrowseSwiperSection
        title="Japanese Anime"
        browseByValues={['Japanese Anime']}
      />

      <BrowseSwiperSection
        title="South Indian"
        browseByValues={['South Indian (Hindi Dubbed)']}
      />

      <BrowseSwiperSection
        title="Punjabi"
        browseByValues={['Indian Punjabi Movies']}
      />

      <EffectiveGateNativeBanner refreshKey="home-public-browseby" />
      <EffectiveGateSquareAd
        refreshKey="home-public-browseby-square"
        className="px-0"
      />

      <Promos />

      {topRatedList.length ? (
        <div className="my-8">
          <h3 className="text-lg font-semibold mb-4">Top Rated</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mobile:gap-2">
            {topRatedList.map((movie) => (
              <MovieCard key={movie?._id} movie={movie} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
