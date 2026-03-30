// frontend-next/src/components/dashboard/BlogPostsClient.jsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';
import Pagination from '../movies/Pagination';

import {
  BLOG_CATEGORIES,
  BLOG_TEMPLATE_TYPES,
  buildBlogPostPath,
  formatBlogTemplateType,
} from '../../lib/blogCategories';
import {
  createBlogPostAdmin,
  deleteBlogPostAdmin,
  getBlogPostAdmin,
  getBlogPostsAdmin,
} from '../../lib/client/blogAdmin';

const EMPTY_FILTERS = {
  search: '',
  categorySlug: '',
  templateType: '',
  trending: '',
  isPublished: '',
};

const inputClass =
  'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

const selectClass =
  'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

const clean = (value = '') => String(value ?? '').trim();
const trimText = (value, max) => clean(value).substring(0, max);

const shortId = (id) => String(id || '').slice(0, 8).toUpperCase();

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const normalizeIdList = (values = []) => {
  const source = Array.isArray(values) ? values : [];
  return Array.from(
    new Set(
      source
        .map((item) => {
          if (item && typeof item === 'object') return item._id || item.id;
          return item;
        })
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
};

const toPlainSections = (sections = []) =>
  (Array.isArray(sections) ? sections : []).map((section) => ({
    heading: clean(section?.heading),
    image: clean(section?.image),
    imageAlt: clean(section?.imageAlt),
    body: clean(section?.body),
    movieLinkText: clean(section?.movieLinkText),
    movieLinkUrl: clean(section?.movieLinkUrl),
  }));

const toPlainFaqs = (faqs = []) =>
  (Array.isArray(faqs) ? faqs : []).map((faq) => ({
    question: clean(faq?.question),
    answer: clean(faq?.answer),
  }));

const buildDuplicatePayload = (post) => ({
  title: trimText(`${clean(post?.title || 'Untitled')} Copy`, 180),
  categorySlug: clean(post?.categorySlug),
  templateType: clean(post?.templateType || 'list'),

  coverImage: clean(post?.coverImage),
  coverImageAlt: clean(post?.coverImageAlt),
  excerpt: clean(post?.excerpt),
  intro: clean(post?.intro),
  quickAnswer: clean(post?.quickAnswer),

  sections: toPlainSections(post?.sections),
  faqs: toPlainFaqs(post?.faqs),

  tags: Array.isArray(post?.tags)
    ? post.tags.map((tag) => clean(tag)).filter(Boolean)
    : [],

  relatedMovieIds: normalizeIdList(post?.relatedMovieIds),
  relatedPostIds: normalizeIdList(post?.relatedPostIds).filter(
    (id) => id !== String(post?._id)
  ),

  authorName: clean(post?.authorName || 'MovieFrost Team'),

  seoTitle: clean(post?.seoTitle),
  seoDescription: clean(post?.seoDescription),
  seoKeywords: clean(post?.seoKeywords),

  isTrending: false,
  isPublished: false,
  publishedAt: null,
});

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(String(value || ''));
    toast.success('Copied');
  } catch {
    toast.error('Copy failed');
  }
}

function Pill({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-main border border-border text-dryGray',
    success: 'bg-green-500/15 border border-green-500 text-green-300',
    danger: 'bg-red-500/15 border border-red-500 text-red-300',
    primary: 'bg-customPurple/15 border border-customPurple text-white',
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded text-[11px] ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
}

export default function BlogPostsClient() {
  return (
    <RequireAdmin>
      {(user) => <BlogPostsInner token={user.token} />}
    </RequireAdmin>
  );
}

function BlogPostsInner({ token }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getBlogPostsAdmin(token, {
        pageNumber: page,
        search: filters.search,
        categorySlug: filters.categorySlug,
        templateType: filters.templateType,
        trending: filters.trending,
        isPublished: filters.isPublished,
      });

      setPosts(Array.isArray(data?.posts) ? data.posts : []);
      setPage(Number(data?.page || 1));
      setPages(Number(data?.pages || 1));
      setTotalPosts(Number(data?.totalPosts || 0));
    } catch (e) {
      toast.error(e?.message || 'Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [token, page, filters]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  const handleDelete = async (post) => {
    if (!post?._id) return;
    const ok = window.confirm(`Delete "${post.title}"?`);
    if (!ok) return;

    try {
      setDeletingId(post._id);
      await deleteBlogPostAdmin(token, post._id);
      toast.success('Blog post deleted');

      const nextPage = posts.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else loadPosts();
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (post) => {
    if (!post?._id) return;

    const ok = window.confirm(`Duplicate "${post.title}" as a new draft?`);
    if (!ok) return;

    try {
      setDuplicatingId(post._id);

      const fullPost = await getBlogPostAdmin(token, post._id);
      if (!fullPost) throw new Error('Blog post not found');

      const created = await createBlogPostAdmin(
        token,
        buildDuplicatePayload(fullPost)
      );

      toast.success('Blog post duplicated as draft');

      if (created?._id) {
        router.push(`/blog-posts/edit/${created._id}`);
      } else {
        loadPosts();
      }
    } catch (e) {
      toast.error(e?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <SideBarShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Blog Posts</h2>
            <p className="text-sm text-dryGray mt-1">
              Manage published and draft blog posts from your dashboard.
            </p>
          </div>

          <Link
            href="/blog-posts/create"
            className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
          >
            Create Blog Post
          </Link>
        </div>

        <form
          onSubmit={applyFilters}
          className="bg-main border border-border rounded-lg p-4"
        >
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input
              value={draftFilters.search}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search title / intro / tags..."
              className={inputClass}
            />

            <select
              value={draftFilters.categorySlug}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  categorySlug: e.target.value,
                }))
              }
              className={selectClass}
            >
              <option value="">All Categories</option>
              {BLOG_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.title}
                </option>
              ))}
            </select>

            <select
              value={draftFilters.templateType}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  templateType: e.target.value,
                }))
              }
              className={selectClass}
            >
              <option value="">All Templates</option>
              {BLOG_TEMPLATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatBlogTemplateType(type)}
                </option>
              ))}
            </select>

            <select
              value={draftFilters.trending}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  trending: e.target.value,
                }))
              }
              className={selectClass}
            >
              <option value="">Trending: All</option>
              <option value="true">Trending Only</option>
              <option value="false">Not Trending</option>
            </select>

            <select
              value={draftFilters.isPublished}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  isPublished: e.target.value,
                }))
              }
              className={selectClass}
            >
              <option value="">Status: All</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="submit"
              className="bg-customPurple hover:bg-opacity-90 transition text-white px-5 py-2 rounded font-semibold text-sm"
            >
              Apply Filters
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="border border-border hover:bg-dry transition text-white px-5 py-2 rounded font-semibold text-sm"
            >
              Clear
            </button>

            <div className="ml-auto text-sm text-dryGray self-center">
              Total posts:{' '}
              <span className="text-white font-semibold">{totalPosts}</span>
            </div>
          </div>
        </form>

        {loading ? (
          <Loader />
        ) : posts.length ? (
          <>
            <div className="sm:hidden space-y-3">
              {posts.map((post) => {
                const publicPath =
                  post?.isPublished && post?.categorySlug && post?.slug
                    ? buildBlogPostPath(post.categorySlug, post.slug)
                    : '';

                return (
                  <article
                    key={post._id}
                    className="bg-main border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold line-clamp-2">
                          {post.title}
                        </p>
                        <p className="text-xs text-dryGray mt-1">
                          ID: {shortId(post._id)}
                        </p>
                        <p className="text-xs text-dryGray mt-1">
                          {post.categoryTitle || post.categorySlug} •{' '}
                          {formatBlogTemplateType(post.templateType)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(post._id)}
                        className="text-xs px-3 py-2 border border-border rounded hover:bg-dry transition"
                      >
                        Copy ID
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.isPublished ? (
                        <Pill variant="success">Published</Pill>
                      ) : (
                        <Pill variant="danger">Draft</Pill>
                      )}

                      {post.isTrending ? (
                        <Pill variant="primary">Trending</Pill>
                      ) : (
                        <Pill>Normal</Pill>
                      )}
                    </div>

                    <div className="text-xs text-dryGray mt-3 space-y-1">
                      <p>Published: {formatDate(post.publishedAt)}</p>
                      <p>Updated: {formatDate(post.updatedAt)}</p>
                      <p>Views: {Number(post.viewCount || 0).toLocaleString()}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link
                        href={`/blog-posts/edit/${post._id}`}
                        className="px-3 py-2 text-xs border border-border rounded hover:bg-dry transition"
                      >
                        Edit
                      </Link>

                      <Link
                        href={`/blog-preview/${post._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-xs border border-border rounded hover:bg-dry transition"
                      >
                        Preview
                      </Link>

                      {publicPath ? (
                        <Link
                          href={publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                        >
                          View
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDuplicate(post)}
                        disabled={duplicatingId === post._id}
                        className="px-3 py-2 text-xs border border-border rounded hover:bg-dry transition disabled:opacity-60"
                      >
                        {duplicatingId === post._id ? 'Duplicating...' : 'Duplicate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={deletingId === post._id}
                        className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60"
                      >
                        {deletingId === post._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-main">
                  <tr>
                    <th className="text-left p-3 border-b border-border">Title</th>
                    <th className="text-left p-3 border-b border-border">Category</th>
                    <th className="text-left p-3 border-b border-border">Template</th>
                    <th className="text-left p-3 border-b border-border">Status</th>
                    <th className="text-left p-3 border-b border-border">Views</th>
                    <th className="text-left p-3 border-b border-border">Published</th>
                    <th className="text-left p-3 border-b border-border">Updated</th>
                    <th className="text-right p-3 border-b border-border">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-dry">
                  {posts.map((post) => {
                    const publicPath =
                      post?.isPublished && post?.categorySlug && post?.slug
                        ? buildBlogPostPath(post.categorySlug, post.slug)
                        : '';

                    return (
                      <tr key={post._id} className="border-b border-border/50">
                        <td className="p-3 align-top">
                          <div className="max-w-[320px]">
                            <p className="text-white font-semibold line-clamp-2">
                              {post.title}
                            </p>
                            <p className="text-[11px] text-dryGray mt-1 font-mono">
                              {post._id}
                            </p>
                          </div>
                        </td>

                        <td className="p-3 align-top">
                          {post.categoryTitle || post.categorySlug}
                        </td>

                        <td className="p-3 align-top">
                          {formatBlogTemplateType(post.templateType)}
                        </td>

                        <td className="p-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            {post.isPublished ? (
                              <Pill variant="success">Published</Pill>
                            ) : (
                              <Pill variant="danger">Draft</Pill>
                            )}

                            {post.isTrending ? (
                              <Pill variant="primary">Trending</Pill>
                            ) : (
                              <Pill>Normal</Pill>
                            )}
                          </div>
                        </td>

                        <td className="p-3 align-top">
                          {Number(post.viewCount || 0).toLocaleString()}
                        </td>

                        <td className="p-3 align-top">{formatDate(post.publishedAt)}</td>

                        <td className="p-3 align-top">{formatDate(post.updatedAt)}</td>

                        <td className="p-3 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => copyText(post._id)}
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
                            >
                              Copy ID
                            </button>

                            <Link
                              href={`/blog-posts/edit/${post._id}`}
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
                            >
                              Edit
                            </Link>

                            <Link
                              href={`/blog-preview/${post._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition"
                            >
                              Preview
                            </Link>

                            {publicPath ? (
                              <Link
                                href={publicPath}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 text-xs border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition"
                              >
                                View
                              </Link>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDuplicate(post)}
                              disabled={duplicatingId === post._id}
                              className="px-3 py-2 text-xs border border-border rounded hover:bg-main transition disabled:opacity-60"
                            >
                              {duplicatingId === post._id ? 'Duplicating...' : 'Duplicate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(post)}
                              disabled={deletingId === post._id}
                              className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60"
                            >
                              {deletingId === post._id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 ? (
              <Pagination page={page} pages={pages} onChange={setPage} />
            ) : null}
          </>
        ) : (
          <div className="bg-main border border-border rounded-lg p-6">
            <h3 className="text-white font-semibold text-lg">
              No blog posts found
            </h3>
            <p className="text-text text-sm mt-2">
              Try changing filters or create your first blog post.
            </p>

            <Link
              href="/blog-posts/create"
              className="inline-block mt-4 bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
            >
              Create Blog Post
            </Link>
          </div>
        )}
      </div>
    </SideBarShell>
  );
}
