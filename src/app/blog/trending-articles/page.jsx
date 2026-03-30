// frontend-next/src/app/blog/trending-articles/page.jsx
import { notFound } from 'next/navigation';

import BlogCard from '../../../components/blog/BlogCard';
import BlogSidebar from '../../../components/blog/BlogSidebar';
import SeoLandingHero from '../../../components/movies/SeoLandingHero';
import VisibleBreadcrumbs from '../../../components/seo/VisibleBreadcrumbs';

import {
  getBlogCategories,
  getBlogPosts,
  getBlogTopViewedThisMonth,
} from '../../../lib/api';
import { buildBlogCategoryPath } from '../../../lib/blogCategories';
import { buildBlogTrendingMetadata } from '../../../lib/blogSeo';

export const revalidate = 300;

const meta = buildBlogTrendingMetadata();

export const metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical },
  robots: { index: true, follow: true },
};

function CategoryPills({ categories = [] }) {
  if (!Array.isArray(categories) || !categories.length) return null;

  return (
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => (
        <a
          key={category.slug}
          href={buildBlogCategoryPath(category.slug)}
          className="whitespace-nowrap px-4 py-2 rounded-full border border-border bg-dry text-sm text-white hover:border-customPurple hover:bg-main transitions"
        >
          {category.emoji ? `${category.emoji} ` : ''}
          {category.title}
        </a>
      ))}
    </div>
  );
}

export default async function TrendingArticlesPage() {
  const [trendingData, categoriesData, topViewedPosts] =
    await Promise.all([
      getBlogPosts(
        { trending: true, pageNumber: 1, limit: 24 },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] })),
      getBlogCategories({ revalidate: 3600 }).catch(() => []),
      getBlogTopViewedThisMonth(5, { revalidate: 300 }).catch(() => []),
    ]);

  const posts = Array.isArray(trendingData?.posts) ? trendingData.posts : [];
  if (!posts.length) notFound();

  const categories = Array.isArray(categoriesData)
    ? categoriesData.filter((item) => Number(item?.postCount || 0) > 0)
    : [];

  const [featured, ...rest] = posts;

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: 'Trending Articles' },
        ]}
        className="mb-4"
      />

      <SeoLandingHero
        contained={false}
        eyebrow="MovieFrost Blog"
        title="Trending Articles"
        description="Explore the most popular movie articles, reviews, explainers, and recommendation posts currently trending on MovieFrost Blog."
        chips={['Trending', `${posts.length} articles`, 'MovieFrost Blog']}
      />

      <CategoryPills categories={categories} />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px] gap-8 mt-8">
        <div className="space-y-8">
          <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4">
            <BlogCard post={featured} featured />

            <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-4">
              {rest.slice(0, 4).map((post) => (
                <BlogCard
                  key={post?._id || `${post?.categorySlug}-${post?.slug}`}
                  post={post}
                  compact
                />
              ))}
            </div>
          </div>

          {rest.length > 4 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rest.slice(4).map((post) => (
                <BlogCard
                  key={post?._id || `${post?.categorySlug}-${post?.slug}`}
                  post={post}
                />
              ))}
            </div>
          ) : null}
        </div>

        <BlogSidebar
          popularPosts={posts.slice(0, 5)}
          topViewedPosts={Array.isArray(topViewedPosts) ? topViewedPosts : []}
          categories={categories}
          adRefreshKey="blog-trending-sidebar"
        />
      </div>
    </div>
  );
}
