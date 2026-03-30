// frontend-next/src/components/blog/BlogSidebar.jsx
import Link from 'next/link';
import BlogCard from './BlogCard';
import SafeImage from '../common/SafeImage';
import { buildBlogCategoryPath, buildBlogPostPath } from '../../lib/blogCategories';
import { EffectiveGateSquareAd } from '../ads/EffectiveGateNativeBanner';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

function Box({ title, children }) {
  return (
    <div className="bg-dry border border-border rounded-lg p-4">
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TopViewedPostItem({ post }) {
  if (!post) return null;

  const href = buildBlogPostPath(post?.categorySlug, post?.slug);
  const categoryTitle = post?.categoryTitle || post?.categorySlug || 'Blog';
  const views = Number(post?.viewCount || 0);
  const imageAlt = post?.coverImageAlt || post?.title || 'Blog post';

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
        <p className="text-sm font-semibold text-white line-clamp-2 leading-5">
          {post?.title}
        </p>

        <p className="text-[11px] text-dryGray mt-1 line-clamp-1">
          {categoryTitle}
        </p>

        <p className="text-[11px] text-customPurple mt-1">
          {views.toLocaleString()} views
        </p>
      </div>
    </Link>
  );
}

export default function BlogSidebar({
  popularPosts = [],
  topViewedPosts = [],
  categories = [],
  adRefreshKey = 'blog-sidebar',
}) {
  const safeCategories = Array.isArray(categories)
    ? categories.filter((item) => Number(item?.postCount || 0) > 0).slice(0, 10)
    : [];

  const safePopularPosts = Array.isArray(popularPosts)
    ? popularPosts.slice(0, 5)
    : [];

  const safeTopViewedPosts = Array.isArray(topViewedPosts)
    ? topViewedPosts.slice(0, 5)
    : [];

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 self-start">
      {safePopularPosts.length ? (
        <Box title="Popular Posts">
          <div className="space-y-3">
            {safePopularPosts.map((post) => (
              <BlogCard
                key={post?._id || `${post?.categorySlug}-${post?.slug}`}
                post={post}
                compact
              />
            ))}
          </div>
        </Box>
      ) : null}

      {safeTopViewedPosts.length ? (
        <Box title="Top 5 Viewed Articles This Month">
          <div className="space-y-3">
            {safeTopViewedPosts.map((post) => (
              <TopViewedPostItem
                key={post?._id || `${post?.categorySlug}-${post?.slug}`}
                post={post}
              />
            ))}
          </div>
        </Box>
      ) : null}

      {ADS_ENABLED && safeTopViewedPosts.length ? (
        <EffectiveGateSquareAd
          refreshKey={`${adRefreshKey}:top-viewed-1x1`}
          minWidthPx={0}
          maxWidthPx={99999}
          className="!my-0"
        />
      ) : null}

      {safeCategories.length ? (
        <Box title="Popular Categories">
          <div className="space-y-2">
            {safeCategories.map((category) => (
              <Link
                key={category.slug}
                href={buildBlogCategoryPath(category.slug)}
                className="flex items-center justify-between rounded-md border border-border bg-main px-3 py-2 text-sm hover:border-customPurple transitions"
              >
                <span className="text-white">
                  {category.emoji ? `${category.emoji} ` : ''}
                  {category.title}
                </span>
                <span className="text-dryGray">{category.postCount}</span>
              </Link>
            ))}
          </div>
        </Box>
      ) : null}
    </aside>
  );
}
