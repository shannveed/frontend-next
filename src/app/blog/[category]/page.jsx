// frontend-next/src/app/blog/[category]/page.jsx
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
import {
  BLOG_CATEGORIES,
  buildBlogCategoryPath,
  formatBlogTemplateType,
  getBlogCategoryBySlug,
} from '../../../lib/blogCategories';
import { buildBlogCategoryMetadata } from '../../../lib/blogSeo';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({ params }) {
  const category = getBlogCategoryBySlug(params?.category);

  if (!category) {
    return {
      title: 'Blog category not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildBlogCategoryMetadata(category);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
  };
}

function CategoryPills({ categories = [], activeSlug = '' }) {
  if (!Array.isArray(categories) || !categories.length) return null;

  return (
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const active = String(category.slug) === String(activeSlug);

        return (
          <a
            key={category.slug}
            href={buildBlogCategoryPath(category.slug)}
            className={`whitespace-nowrap px-4 py-2 rounded-full border text-sm transitions ${active
              ? 'bg-customPurple border-customPurple text-white'
              : 'border-border bg-dry text-white hover:border-customPurple hover:bg-main'
              }`}
          >
            {category.emoji ? `${category.emoji} ` : ''}
            {category.title}
          </a>
        );
      })}
    </div>
  );
}

export default async function BlogCategoryPage({ params }) {
  const category = getBlogCategoryBySlug(params?.category);
  if (!category) notFound();

  const [postsData, categoriesData, trendingData, topViewedPosts] =
    await Promise.all([
      getBlogPosts(
        {
          categorySlug: category.slug,
          pageNumber: 1,
          limit: 24,
        },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] })),
      getBlogCategories({ revalidate: 3600 }).catch(() => []),
      getBlogPosts(
        {
          trending: true,
          pageNumber: 1,
          limit: 5,
        },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] })),
      getBlogTopViewedThisMonth(5, { revalidate: 300 }).catch(() => []),
    ]);

  const posts = Array.isArray(postsData?.posts) ? postsData.posts : [];
  if (!posts.length) notFound();

  const sidebarCategories = Array.isArray(categoriesData)
    ? categoriesData.filter((item) => Number(item?.postCount || 0) > 0)
    : [];

  const popularPosts = Array.isArray(trendingData?.posts)
    ? trendingData.posts
      .filter((item) => String(item?._id) !== String(posts?.[0]?._id))
      .slice(0, 5)
    : [];

  const [featured, ...rest] = posts;

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: category.title },
        ]}
        className="mb-4"
      />

      <SeoLandingHero
        contained={false}
        eyebrow="MovieFrost Blog"
        title={category.title}
        description={category.description}
        chips={[
          category.emoji ? `${category.emoji} ${category.title}` : category.title,
          `${posts.length} articles`,
          formatBlogTemplateType(category.templateType),
        ]}
      />

      <CategoryPills categories={sidebarCategories} activeSlug={category.slug} />

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
          popularPosts={popularPosts}
          topViewedPosts={Array.isArray(topViewedPosts) ? topViewedPosts : []}
          categories={sidebarCategories}
          adRefreshKey={`blog-category-sidebar-${category.slug}`}
        />
      </div>
    </div>
  );
}
