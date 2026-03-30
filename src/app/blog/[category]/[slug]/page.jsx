// frontend-next/src/app/blog/[category]/[slug]/page.jsx
import { cache } from 'react';
import { notFound } from 'next/navigation';

import JsonLd from '@/components/seo/JsonLd';
import VisibleBreadcrumbs from '@/components/seo/VisibleBreadcrumbs';
import BlogSidebar from '@/components/blog/BlogSidebar';
import BlogCard from '@/components/blog/BlogCard';
import BlogToc from '@/components/blog/BlogToc';
import BlogSectionBlock from '@/components/blog/BlogSectionBlock';
import MovieCard from '@/components/movie/MovieCard';
import SafeImage from '@/components/common/SafeImage';

import {
  getBlogCategories,
  getBlogPost,
  getBlogPosts,
  getBlogTopViewedThisMonth,
} from '@/lib/api';
import {
  buildBlogCategoryPath,
  buildBlogHomePath,
  formatBlogTemplateType,
  getBlogCategoryBySlug,
} from '@/lib/blogCategories';
import {
  buildBlogArticleGraphJsonLd,
  buildBlogPostMetadata,
} from '@/lib/blogSeo';
import { slugifySegment } from '@/lib/discoveryPages';

export const revalidate = 300;
export const dynamicParams = true;

const getPost = cache((category, slug) =>
  getBlogPost(category, slug, { revalidate })
);

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

export async function generateMetadata({ params }) {
  const post = await getPost(params?.category, params?.slug);

  if (!post) {
    return {
      title: 'Article not found',
      robots: { index: false, follow: false },
    };
  }

  const meta = buildBlogPostMetadata(post);

  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      url: meta.canonical,
      title: meta.title,
      description: meta.description,
      images: meta.image ? [meta.image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: meta.image ? [meta.image] : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getPost(params?.category, params?.slug);
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

  const graph = buildBlogArticleGraphJsonLd(post, category);

  return (
    <>
      <JsonLd data={graph} />

      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        <VisibleBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: buildBlogHomePath() },
            { label: category.title, href: buildBlogCategoryPath(category.slug) },
            { label: post.title },
          ]}
          className="mb-4"
        />

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
            adRefreshKey={`blog-post-sidebar-${post?.slug || post?._id}`}
          />
        </div>
      </div>
    </>
  );
}
