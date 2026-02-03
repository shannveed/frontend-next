// frontend-next/src/components/movie/RelatedMoviesServer.jsx
import Link from 'next/link';
import { BsCollectionFill } from 'react-icons/bs';

export default function RelatedMoviesServer({ movies = [], currentId = null }) {
  const list = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const filtered = currentId
    ? list.filter((m) => String(m?._id) !== String(currentId))
    : list;

  const top = filtered.slice(0, 10);

  if (!top.length) return null;

  return (
    <section className="my-16">
      <div className="flex items-center gap-2 mb-6">
        <BsCollectionFill className="text-white" />
        <h3 className="text-white font-semibold">Related Movies</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-5 gap-4">
        {top.map((m) => {
          const seg = m?.slug || m?._id;
          const img = m?.titleImage || m?.image || '/images/placeholder.jpg';

          return (
            <Link
              key={m._id}
              href={`/movie/${seg}`}
              className="group bg-dry border border-border rounded-lg overflow-hidden hover:border-customPurple transitions"
            >
              <div className="w-full aspect-[2/3] bg-black/30 overflow-hidden">
                <img
                  src={img}
                  alt={m?.name || 'Movie'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                />
              </div>

              <div className="p-2">
                <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-customPurple transitions">
                  {m?.name}
                </p>
                <p className="text-xs text-dryGray line-clamp-1">
                  {m?.year ? `${m.year}` : ''}{m?.category ? ` • ${m.category}` : ''}
                </p>
              </div>
            </Link>
          );
        })}
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
