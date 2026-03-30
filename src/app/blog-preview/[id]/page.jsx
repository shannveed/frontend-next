// frontend-next/src/app/blog-preview/[id]/page.jsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import BlogCard from '@/components/blog/BlogCard';
import BlogSidebar from '@/components/blog/BlogSidebar';
import BlogToc from '@/components/blog/BlogToc';
import BlogSectionBlock from '@/components/blog/BlogSectionBlock';
import MovieCard from '@/components/movie/MovieCard';
import SafeImage from '@/components/common/SafeImage';
import VisibleBreadcrumbs from '@/components/seo/VisibleBreadcrumbs';

import {
  getBlogCategories,
  getBlogPosts,
  getBlogTopViewedThisMonth,
} from '@/lib/api';
import {
  buildBlogCategoryPath,
  buildBlogPostPath,
  formatBlogTemplateType,
  getBlogCategoryBySlug,
} from '@/lib/blogCategories';
import { slugifySegment } from '@/lib/discoveryPages';
import { getAdminPreviewToken } from '@/lib/server/adminListingPreview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Blog Preview',
  robots: { index: false, follow: false },
};

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://moviefrost-backend-three.vercel.app';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api$/i, '');
const API = `${API_BASE}/api`;

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const buildSectionId = (heading, index) =>
  slugifySegment(heading) || `section-${index + 1}`;

async function getBlogPreview(id, token) {
  const safe = encodeURIComponent(String(id || '').trim());
  if (!safe || !token) return null;

  try {
    const res = await fetch(`${API}/blog/admin/${safe}/preview`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if ([400, 401, 403, 404].includes(res.status)) return null;
    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

export default async function BlogPreviewPage({ params }) {
  const token = getAdminPreviewToken();
  if (!token) redirect('/login');

  const post = await getBlogPreview(params?.id, token);
  if (!post) notFound();

  const category =
    getBlogCategoryBySlug(post?.categorySlug) || {
      slug: String(post?.categorySlug || '').trim(),
      title: String(post?.categoryTitle || 'Blog').trim(),
      description: '',
      emoji: '',
    };

  const [categoriesData, trendingData, topViewedData] =
    await Promise.all([
      getBlogCategories({ revalidate: 3600 }).catch(() => []),
      getBlogPosts(
        { trending: true, pageNumber: 1, limit: 5 },
        { revalidate: 300 }
      ).catch(() => ({ posts: [] })),
      getBlogTopViewedThisMonth(6, { revalidate: 300 }).catch(() => []),
    ]);

  const sidebarCategories = Array.isArray(categoriesData)
    ? categoriesData.filter((item) => Number(item?.postCount || 0) > 0)
    : [];

  const popularPosts = Array.isArray(trendingData?.posts)
    ? trendingData.posts
      .filter((item) => String(item?._id) !== String(post?._id))
      .slice(0, 5)
    : [];

  const topViewedPosts = Array.isArray(topViewedData)
    ? topViewedData
      .filter((item) => String(item?._id) !== String(post?._id))
      .slice(0, 5)
    : [];

  const relatedPosts = Array.isArray(post?.relatedPosts)
    ? post.relatedPosts
      .filter((item) => String(item?._id) !== String(post?._id))
      .slice(0, 4)
    : [];

  const relatedMovies = Array.isArray(post?.relatedMovies)
    ? post.relatedMovies.slice(0, 6)
    : [];

  const sections = Array.isArray(post?.sections) ? post.sections : [];
  const faqs = Array.isArray(post?.faqs) ? post.faqs : [];

  const publishedLabel = formatDate(post?.publishedAt || post?.createdAt);
  const updatedLabel = formatDate(post?.updatedAt);

  const publicPath =
    post?.categorySlug && post?.slug
      ? buildBlogPostPath(post.categorySlug, post.slug)
      : '';

  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <VisibleBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog Preview' },
          { label: post?.title || 'Preview' },
        ]}
        className="mb-4"
      />

      <div className="bg-main border border-customPurple rounded-lg p-4 mb-6">
        <p className="text-xs uppercase tracking-wide text-customPurple font-semibold">
          Admin Preview
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="px-3 py-1 rounded bg-dry border border-border text-xs text-white">
            {post?.isPublished ? 'Published version preview' : 'Draft preview'}
          </span>

          <span className="px-3 py-1 rounded bg-dry border border-border text-xs text-white">
            {formatBlogTemplateType(post?.templateType || 'list')}
          </span>
        </div>

        <p className="text-sm text-dryGray mt-3">
          This page is admin-only and shows the <strong>last saved version</strong> of
          the article. Unsaved editor changes will not appear here.
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <Link
            href={`/blog-posts/edit/${post?._id}`}
            className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
          >
            Edit Post
          </Link>

          {publicPath && post?.isPublished ? (
            <Link
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="border border-border hover:bg-dry transition text-white px-4 py-2 rounded font-semibold text-sm"
            >
              Open Public Page
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
        <article className="bg-dry border border-border rounded-lg p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
            <span className="text-customPurple font-semibold">
              {category.emoji ? `${category.emoji} ` : ''}
              {category.title}
            </span>

            {post?.isTrending ? (
              <span className="px-2 py-0.5 rounded bg-customPurple/15 border border-customPurple text-white">
                Trending
              </span>
            ) : null}

            {post?.templateType ? (
              <span className="px-2 py-0.5 rounded bg-main border border-border text-dryGray">
                {formatBlogTemplateType(post.templateType)}
              </span>
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {post?.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-dryGray">
            {post?.authorName ? (
              <span>
                By <span className="text-white">{post.authorName}</span>
              </span>
            ) : null}

            {publishedLabel ? <span>Published: {publishedLabel}</span> : null}
            {updatedLabel ? <span>Updated: {updatedLabel}</span> : null}

            {Number.isFinite(Number(post?.viewCount)) ? (
              <span>{Number(post.viewCount).toLocaleString()} views</span>
            ) : null}
          </div>

          {Array.isArray(post?.tags) && post.tags.length ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded bg-main border border-border text-xs text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-border bg-main mt-6">
            <SafeImage
              src={post?.coverImage}
              fallbackCandidates={['/images/MOVIEFROST.png']}
              alt={post?.coverImageAlt || post?.title || 'Blog post'}
              fill
              sizes="(max-width: 1280px) 100vw, 900px"
              className="object-cover"
            />
          </div>

          {post?.intro ? (
            <div className="mt-6">
              <p className="text-text text-sm sm:text-base leading-8 whitespace-pre-line">
                {post.intro}
              </p>
            </div>
          ) : null}

          {post?.quickAnswer ? (
            <div className="mt-6 bg-main border border-border rounded-lg p-4">
              <h2 className="text-white font-semibold text-base mb-2">
                Quick Answer
              </h2>
              <p className="text-text text-sm leading-7 whitespace-pre-line">
                {post.quickAnswer}
              </p>
            </div>
          ) : null}

          <BlogToc sections={sections} />

          <div className="space-y-8">
            {sections.map((section, index) => (
              <BlogSectionBlock
                key={`${section?.heading || 'section'}-${index}`}
                section={section}
                sectionId={buildSectionId(section?.heading, index)}
                postTitle={post?.title}
              />
            ))}
          </div>

          {faqs.length ? (
            <section className="mt-10">
              <h2 className="text-white text-xl font-semibold mb-4">
                Frequently Asked Questions
              </h2>

              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <details
                    key={`${faq?.question || 'faq'}-${index}`}
                    className="bg-main border border-border rounded-lg p-4"
                  >
                    <summary className="cursor-pointer text-white font-semibold text-sm sm:text-base">
                      {faq.question}
                    </summary>
                    <div className="mt-2 text-text text-sm leading-7 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {relatedMovies.length ? (
            <section className="mt-10">
              <h2 className="text-white text-xl font-semibold mb-4">
                Related Movies
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {relatedMovies.map((movie) => (
                  <MovieCard key={movie?._id} movie={movie} showLike />
                ))}
              </div>
            </section>
          ) : null}

          {relatedPosts.length ? (
            <section className="mt-10">
              <h2 className="text-white text-xl font-semibold mb-4">
                Related Articles
              </h2>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {relatedPosts.map((item) => (
                  <BlogCard
                    key={item?._id || `${item?.categorySlug}-${item?.slug}`}
                    post={item}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <BlogSidebar
          popularPosts={popularPosts}
          topViewedPosts={topViewedPosts}
          categories={sidebarCategories}
          adRefreshKey={`blog-preview-sidebar-${post?._id}`}
        />
      </div>
    </div>
  );
}
