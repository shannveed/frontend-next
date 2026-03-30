// frontend-next/src/app/blog/page.jsx
import Link from 'next/link';

import BlogCard from '../../components/blog/BlogCard';
import BlogSidebar from '../../components/blog/BlogSidebar';
import SeoLandingHero from '../../components/movies/SeoLandingHero';

import {
  getBlogCategories,
  getBlogPosts,
  getBlogTopViewedThisMonth,
} from '../../lib/api';
import {
  BLOG_TRENDING_PATH,
  buildBlogCategoryPath,
} from '../../lib/blogCategories';
import { buildBlogHomeMetadata } from '../../lib/blogSeo';

export const revalidate = 300;

const meta = buildBlogHomeMetadata();

export const metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.canonical },
  robots: { index: true, follow: true },
};

function CategoryPills({ categories = [], animatedBorder = false }) {
  if (!Array.isArray(categories) || !categories.length) return null;

  const pills = categories.map((category) => (
    <Link
      key={category.slug}
      href={buildBlogCategoryPath(category.slug)}
      className="whitespace-nowrap px-4 py-2 rounded-full border border-border bg-dry text-sm text-white hover:border-customPurple hover:bg-main transitions"
    >
      {category.emoji ? `${category.emoji} ` : ''}
      {category.title}
    </Link>
  ));

  if (animatedBorder) {
    return (
      <div className="mt-6 mf-animated-border-panel">
        <div className="mf-animated-border-panel-inner px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">{pills}</div>
        </div>
      </div>
    );
  }

  return <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{pills}</div>;
}

function SectionHeader({ title, description = '', href }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-white text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="text-dryGray text-sm mt-1">{description}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="text-sm text-customPurple hover:underline"
        >
          View all
        </Link>
      ) : null}
    </div>
  );
}

function FeaturedTrending({ posts = [] }) {
  if (!Array.isArray(posts) || !posts.length) return null;

  const [featured, ...rest] = posts;

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Trending Articles"
        description="The most-read reviews, explainers, and recommendation posts right now."
        href={BLOG_TRENDING_PATH}
      />

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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.slice(4, 8).map((post) => (
            <BlogCard
              key={post?._id || `${post?.categorySlug}-${post?.slug}`}
              post={post}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BlogListSection({ title, description = '', href, posts = [] }) {
  if (!Array.isArray(posts) || !posts.length) return null;

  return (
    <section className="space-y-4">
      <SectionHeader title={title} description={description} href={href} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <BlogCard
            key={post?._id || `${post?.categorySlug}-${post?.slug}`}
            post={post}
          />
        ))}
      </div>
    </section>
  );
}

export default async function BlogHomePage() {
  const [categoriesData, trendingData, topViewedPosts] =
    await Promise.all([
      getBlogCategories({ revalidate: 3600 }).catch(() => []),
      getBlogPosts(
        { trending: true, pageNumber: 1, limit: 8 },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] })),
      getBlogTopViewedThisMonth(5, { revalidate: 300 }).catch(() => []),
    ]);

  const categoriesWithPosts = Array.isArray(categoriesData)
    ? categoriesData.filter((item) => Number(item?.postCount || 0) > 0)
    : [];

  const trendingPosts = Array.isArray(trendingData?.posts)
    ? trendingData.posts
    : [];

  const categorySections = await Promise.all(
    categoriesWithPosts.slice(0, 5).map(async (category) => {
      const data = await getBlogPosts(
        {
          categorySlug: category.slug,
          pageNumber: 1,
          limit: 4,
        },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] }));

      return {
        category,
        posts: Array.isArray(data?.posts) ? data.posts : [],
      };
    })
  );

  const hasAnyContent =
    trendingPosts.length > 0 ||
    categorySections.some((section) => section.posts.length > 0);

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <SeoLandingHero
        contained={false}
        eyebrow="MovieFrost Blog"
        title="Latest Movie Articles, Reviews & Explained Guides"
        description="Browse trending movie articles, reviews, ending explained guides, recommendation lists, and upcoming movie updates on MovieFrost."
        chips={[
          'Trending Articles',
          ...categoriesWithPosts.slice(0, 4).map((category) => category.title),
        ]}
      />

      <CategoryPills categories={categoriesWithPosts} animatedBorder />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px] gap-8 mt-8">
        <div className="space-y-10">
          <FeaturedTrending posts={trendingPosts} />

          {categorySections.map((section) => (
            <BlogListSection
              key={section.category.slug}
              title={section.category.title}
              description={section.category.description}
              href={buildBlogCategoryPath(section.category.slug)}
              posts={section.posts}
            />
          ))}

          {!hasAnyContent ? (
            <div className="bg-dry border border-border rounded-2xl p-6">
              <h2 className="text-white text-lg font-semibold">
                Blog posts are coming soon
              </h2>
              <p className="text-text text-sm mt-2">
                Publish your first articles from the blog admin flow, and they will automatically appear here.
              </p>
            </div>
          ) : null}
        </div>

        <BlogSidebar
          popularPosts={trendingPosts}
          topViewedPosts={Array.isArray(topViewedPosts) ? topViewedPosts : []}
          categories={categoriesWithPosts}
          adRefreshKey="blog-home-sidebar"
        />
      </div>
    </div>
  );
}
