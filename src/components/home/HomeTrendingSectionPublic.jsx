// frontend-next/src/components/home/HomeTrendingSectionPublic.jsx
import Link from 'next/link';
import { RiMovie2Line } from 'react-icons/ri';

import MovieCard from '../movie/MovieCard';
import EffectiveGateNativeBanner, {
  EffectiveGateSquareAd,
} from '../ads/EffectiveGateNativeBanner';

const HOME_TRENDING_LIMIT = 50;

const FAQS = [
  {
    question: 'What is MovieFrost?',
    answer:
      'MovieFrost is a movie and web series discovery platform built for users who want a fast way to browse trending movies, TV series, new releases, genres, languages and film industries in one place.',
  },
  {
    question: 'Can I watch movies online free in HD on MovieFrost?',
    answer:
      'MovieFrost helps users discover movie and web series pages with HD-focused viewing options, multiple servers, trailers, cast details, ratings and related recommendations.',
  },
  {
    question: 'Does MovieFrost include TV series and web series?',
    answer:
      'Yes. MovieFrost includes movies, web series and TV shows across many categories including Hollywood, Bollywood, Korean drama, Japanese anime, Chinese drama, South Indian Hindi dubbed titles and more.',
  },
  {
    question: 'How do I find trending movies and TV series?',
    answer:
      'The homepage highlights trending movies and TV series first. You can also browse dedicated listing pages by type, genre, language, year, rating and film industry to find what fits your mood.',
  },
  {
    question: 'Why is the MovieFrost homepage useful?',
    answer:
      'The homepage combines trending titles, new releases, popular recommendations, film-industry browsing and helpful discovery content so viewers can quickly decide what to watch next.',
  },
];

function EmptyState() {
  return (
    <div className="w-full gap-6 flex-colo py-12">
      <div className="flex-colo w-24 h-24 p-5 mb-4 rounded-full bg-dry text-customPurple text-4xl">
        <RiMovie2Line />
      </div>
      <p className="text-border text-sm">No Trending titles yet.</p>
    </div>
  );
}

function TrendingHeading({ total }) {
  return (
    <section className="mb-5">
      <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
        MovieFrost Trending
      </p>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
        Discover Trending Movies and TV Series
      </h1>
    </section>
  );
}

function HomepageSeoDescription() {
  return (
    <section className="mt-8 bg-dry border border-border rounded-2xl p-5 sm:p-7">
      <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
        Watch Movies Online Free in HD
      </p>

      <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
        Moviefrost for Movies, TV Series and Web Series Discovery
      </h2>

      <div className="mt-4 space-y-4 text-text text-sm sm:text-base leading-8">
        <p>
          MovieFrost is designed for viewers who want a simple, fast and organized
          way to discover movies and TV series online. Instead of jumping between
          confusing pages, the homepage brings together trending movies, new
          releases, popular web series, genre collections and industry-based
          browsing in one clean experience. Whether you are searching for action
          movies, drama, comedy, thriller, romance, horror, sci-fi, animation,
          crime stories or family-friendly entertainment, MovieFrost helps you
          start from the right place.
        </p>

        <p>
          The homepage is built around discovery. Trending titles appear first so
          you can quickly see what is popular, while new releases make it easier
          to find recently added movies and web series. You can continue browsing
          Hollywood English movies, Hollywood Hindi dubbed movies, Bollywood
          movies, South Indian Hindi dubbed titles, Korean drama, Chinese drama,
          Japanese anime, Japanese movies, Punjabi movies and more through
          dedicated film-industry collections. This structure helps users and
          search engines understand the main topics of the website clearly.
        </p>

        <p>
          Every movie page on MovieFrost focuses on useful details such as title,
          poster, story description, year, runtime, language, category, cast,
          director, trailer, ratings and related titles. For web series, episode
          and season information helps viewers move through content easily. The
          goal is to make MovieFrost a helpful starting point when you want to
          decide what to watch next, compare similar titles or explore a specific
          language, genre or film industry.
        </p>

        <p>
          If you are looking to watch movies online free in HD, browse web series,
          discover trending TV shows or explore movies by language and industry,
          MovieFrost gives you a direct path from the homepage to the right
          collection. Start with the trending section, explore new releases, or
          open the Browse By Film Industry page to find entertainment that matches
          your taste.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          MovieFrost Homepage FAQs
        </h2>

        <div className="mt-4 space-y-3">
          {FAQS.map((faq, index) => (
            <details
              key={`${faq.question}-${index}`}
              className="bg-main border border-border rounded-lg p-4"
            >
              <summary className="cursor-pointer text-white font-semibold text-sm sm:text-base">
                {faq.question}
              </summary>

              <div className="mt-2 text-text text-sm leading-7">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeTrendingSectionPublic({ movies = [] }) {
  const list = Array.isArray(movies)
    ? movies.filter(Boolean).slice(0, HOME_TRENDING_LIMIT)
    : [];

  return (
    <>
      <TrendingHeading total={list.length} />

      {list.length ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mobile:gap-2">
            {list.map((movie) => (
              <MovieCard key={movie?._id} movie={movie} />
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <Link
              href="/movies"
              className="bg-customPurple hover:bg-transparent border-2 border-customPurple text-white px-10 py-3 rounded-md font-semibold text-base transitions"
            >
              Show More
            </Link>
          </div>
        </>
      ) : (
        <EmptyState />
      )}

      <EffectiveGateNativeBanner refreshKey="home-public-trending" />
      <EffectiveGateSquareAd
        refreshKey="home-public-trending-square"
        className="px-0"
      />

      <HomepageSeoDescription />
    </>
  );
}
