// frontend-next/src/components/movie/RelatedMoviesServer.jsx
import Link from 'next/link';
import { BsCollectionFill } from 'react-icons/bs';
import MovieCard from './MovieCard';

export default function RelatedMoviesServer({
  movies = [],
  currentId = null,
  limit = 20,
}) {
  const list = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const filtered = currentId
    ? list.filter((m) => String(m?._id) !== String(currentId))
    : list;

  const top = filtered.slice(0, limit);

  if (!top.length) return null;

  return (
    <section className="my-16">
      <div className="flex items-center gap-2 mb-6">
        <BsCollectionFill className="text-white" />
        <h3 className="text-white font-semibold">Related Movies</h3>
      </div>

      {/* ✅ Match Watch page grid styling */}
      <div className="grid sm:mt-6 mt-4 xl:grid-cols-5 2xl:grid-cols-5 lg:grid-cols-3 sm:grid-cols-5 mobile:grid-cols-2 mobile:gap-3 gap-4">
        {top.map((m) => (
          <MovieCard key={m._id} movie={m} showLike />
        ))}
      </div>

      <div className="flex justify-center mt-10">
        <Link
          href="/movies"
          className="bg-customPurple hover:bg-transparent border-2 border-customPurple transitions text-white px-8 py-3 rounded font-medium"
        >
          Show More
        </Link>
      </div>
    </section>
  );
}
