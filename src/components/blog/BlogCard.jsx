// frontend-next/src/components/blog/BlogCard.jsx
import Link from 'next/link';
import SafeImage from '../common/SafeImage';
import { buildBlogPostPath, getBlogCategoryBySlug } from '../../lib/blogCategories';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function BlogCard({ post, compact = false }) {
  if (!post) return null;

  const href = buildBlogPostPath(post?.categorySlug, post?.slug);
  const category = getBlogCategoryBySlug(post?.categorySlug);
  const categoryTitle = post?.categoryTitle || category?.title || 'Blog';
  const excerpt = String(post?.excerpt || post?.intro || '').trim();
  const publishedAt = formatDate(post?.publishedAt || post?.createdAt);
  const imageAlt = post?.coverImageAlt || post?.title || 'Blog post';

  if (compact) {
    return (
      <Link
        href={href}
        className="flex gap-3 rounded-lg border border-border bg-main p-2 hover:border-customPurple transitions"
      >
        <div className="relative w-24 h-16 rounded overflow-hidden bg-black flex-shrink-0">
          <SafeImage
            src={post?.coverImage}
            fallbackCandidates={['/images/MOVIEFROST.png']}
            alt={imageAlt}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-customPurple font-semibold truncate">
            {categoryTitle}
          </p>
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-5">
            {post?.title}
          </h3>
          {publishedAt ? (
            <p className="text-[11px] text-dryGray mt-1">{publishedAt}</p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <article className="bg-dry border border-border rounded-lg overflow-hidden hover:border-customPurple transitions">
      <Link href={href} className="block">
        <div className="relative w-full aspect-[16/9] bg-main">
          <SafeImage
            src={post?.coverImage}
            fallbackCandidates={['/images/MOVIEFROST.png']}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <span className="text-customPurple font-semibold">{categoryTitle}</span>
            {post?.isTrending ? (
              <span className="px-2 py-0.5 rounded bg-customPurple/15 border border-customPurple text-white">
                Trending
              </span>
            ) : null}
            {publishedAt ? (
              <span className="text-dryGray">{publishedAt}</span>
            ) : null}
          </div>

          <h3 className="text-white font-semibold text-lg leading-7 line-clamp-2">
            {post?.title}
          </h3>

          {excerpt ? (
            <p className="text-text text-sm leading-6 mt-2 line-clamp-3">
              {excerpt}
            </p>
          ) : null}

          {post?.authorName ? (
            <p className="text-dryGray text-xs mt-3">
              By <span className="text-white">{post.authorName}</span>
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
