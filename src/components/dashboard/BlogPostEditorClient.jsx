// frontend-next/src/components/dashboard/BlogPostEditorClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import RequireAdmin from '../auth/RequireAdmin';
import SideBarShell from './SideBarShell';
import Loader from '../common/Loader';
import Uploader from '../common/Uploader';

import {
  BLOG_CATEGORIES,
  BLOG_TEMPLATE_TYPES,
  buildBlogPostCanonical,
  buildBlogPostPath,
  formatBlogTemplateType,
  getBlogCategoryBySlug,
} from '../../lib/blogCategories';
import { slugifySegment } from '../../lib/discoveryPages';
import {
  createBlogPostAdmin,
  getBlogPostAdmin,
  getBlogPostsAdmin,
  updateBlogPostAdmin,
} from '../../lib/client/blogAdmin';
import { getMovieByIdAdmin } from '../../lib/client/moviesAdmin';
import { findMoviesByNamesAdmin } from '../../lib/client/moviesLookup';

const clean = (value = '') => String(value ?? '').trim();
const trimText = (value, max) => clean(value).substring(0, max);

const uniqStrings = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

const splitCommaOrLines = (value = '') =>
  uniqStrings(String(value || '').split(/[\n,]+/g).map((item) => item.trim()));

const isValidLinkUrl = (value = '') => {
  const next = clean(value);
  if (!next) return true;
  return next.startsWith('/') || /^https?:\/\//i.test(next);
};

const emptySection = () => ({
  heading: '',
  image: '',
  imageAlt: '',
  body: '',
  movieLinkText: '',
  movieLinkUrl: '',
});

const emptyFaq = () => ({
  question: '',
  answer: '',
});

const makeEmptyForm = () => ({
  title: '',
  categorySlug: BLOG_CATEGORIES[0]?.slug || '',
  templateType: BLOG_CATEGORIES[0]?.templateType || 'list',

  coverImage: '',
  coverImageAlt: '',
  excerpt: '',
  intro: '',
  quickAnswer: '',

  sections: [emptySection()],
  faqs: [],

  tagsText: '',
  relatedMovieIdsText: '',
  relatedPostIdsText: '',

  authorName: 'MovieFrost Editorial Team',

  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',

  isTrending: false,
  isPublished: false,
  publishedAt: '',
});

const inputClass =
  'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

const textareaClass =
  'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple min-h-[120px]';

const toDateTimeLocalValue = (value) => {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const BLOG_TEMPLATE_GUIDES = {
  list: {
    purpose:
      'Use this for “best of”, ranked lists, top 10 articles, and curated collections.',
    exampleTitle: 'Best Sci-Fi Movies to Watch in 2026',
    excerpt:
      'A ranked list of must-watch sci-fi movies, including beginner-friendly picks, classics, and underrated gems.',
    quickAnswer:
      'If you want one fast recommendation, start with the strongest overall pick and explain why it wins.',
    sectionHeadings: [
      'Quick List Overview',
      'Best Overall Pick',
      'Best for Beginners',
      'Best Underrated Pick',
      'How We Chose These Titles',
    ],
    faqQuestions: [
      'Which movie should I watch first?',
      'Are these picks beginner-friendly?',
    ],
    tips: [
      'Keep your ranking logic clear.',
      'Make each section answer “why this title matters”.',
      'Use tags for franchise names, genres, and intent keywords.',
      'Use the section movie-link card to send readers to the exact movie page beautifully.',
    ],
  },

  review: {
    purpose:
      'Use this for a focused opinion piece, verdict, strengths/weaknesses, and final recommendation.',
    exampleTitle: 'Dune: Part Two Review - Is It Worth Watching?',
    excerpt:
      'A spoiler-light review covering story, performances, visuals, pacing, and final verdict.',
    quickAnswer:
      'Give the verdict in 1-2 sentences so readers know whether the movie is worth their time.',
    sectionHeadings: [
      'Quick Verdict',
      'Story Overview (Spoiler-Light)',
      'Performances and Direction',
      'Visuals, Music, and Pacing',
      'Final Review Score and Recommendation',
    ],
    faqQuestions: [
      'Is this movie worth watching in theaters?',
      'Is the review spoiler free?',
    ],
    tips: [
      'Keep intro spoiler-light.',
      'Use quickAnswer as the verdict box.',
      'End with a clear recommendation and target audience.',
      'Add a section movie-link card when you want to point users directly to the movie page.',
    ],
  },

  explained: {
    purpose:
      'Use this for ending explained, plot breakdown, hidden meaning, and theory-driven articles.',
    exampleTitle: 'Interstellar Ending Explained',
    excerpt:
      'A clear explanation of the ending, key themes, timeline logic, and what the final scenes really mean.',
    quickAnswer:
      'Answer the ending in simple language first, then use sections for deeper explanation.',
    sectionHeadings: [
      'Quick Ending Answer',
      'What Happens in the Final Act',
      'Why the Ending Matters',
      'Hidden Meaning and Theories',
      'Final Interpretation',
    ],
    faqQuestions: [
      'What does the ending really mean?',
      'Did the main character survive?',
    ],
    tips: [
      'Start with the direct answer.',
      'Avoid confusing readers with too much theory in the intro.',
      'Use section headings that match real user questions.',
      'Use the movie-link card inside the most relevant section for better internal linking.',
    ],
  },

  'movies-like': {
    purpose:
      'Use this for recommendation posts based on similar mood, plot, genre, or theme.',
    exampleTitle: '10 Movies Like Interstellar You Should Watch Next',
    excerpt:
      'A recommendation list for fans of Interstellar, with similar sci-fi, emotional, and mind-bending movies.',
    quickAnswer:
      'Tell the reader the closest match first, then explain the other good alternatives.',
    sectionHeadings: [
      'Best Match If You Loved the Original',
      'Movies With Similar Themes',
      'Best Emotional Alternatives',
      'Best Mind-Bending Picks',
      'Where to Start First',
    ],
    faqQuestions: [
      'Which movie is most similar?',
      'What should I watch first if I loved the original?',
    ],
    tips: [
      'Explain why each recommendation is similar.',
      'Use tags for original movie name + sub-intent keywords.',
      'Keep the first recommendation strongest.',
      'Add direct movie CTA cards under sections to help users jump quickly.',
    ],
  },

  upcoming: {
    purpose:
      'Use this for release-date news, upcoming cast updates, trailer coverage, and production info.',
    exampleTitle: 'Upcoming Marvel Movies in 2026 - Release Dates, Cast & Trailer',
    excerpt:
      'Everything known so far about upcoming releases, including release date, cast, trailer, and latest updates.',
    quickAnswer:
      'Summarize the current release window or main update in one short paragraph.',
    sectionHeadings: [
      'Release Date',
      'Cast and Crew',
      'Trailer and First Look',
      'Plot Expectations',
      'Latest Updates',
    ],
    faqQuestions: [
      'When is it releasing?',
      'Is there a trailer yet?',
    ],
    tips: [
      'Keep dates factual and current.',
      'Use publishedAt if timing matters.',
      'Update the article whenever new trailer/cast info appears.',
      'Use a movie CTA card in update sections when the title already has a live page.',
    ],
  },
};

function SelectedRelationCard({ title, subtitle = '', href = '', onRemove }) {
  const content = (
    <div className="min-w-0 flex-1">
      <p className="text-white font-semibold text-sm line-clamp-2">{title}</p>
      {subtitle ? <p className="text-xs text-dryGray mt-1">{subtitle}</p> : null}
    </div>
  );

  return (
    <div className="bg-dry border border-border rounded-lg p-3 flex items-start gap-3">
      {href ? (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 hover:text-customPurple transitions"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-xs px-3 py-2 border border-border rounded hover:bg-main transition"
      >
        Remove
      </button>
    </div>
  );
}

function SearchResultCard({ title, subtitle = '', onAdd, disabled = false, href = '' }) {
  const body = (
    <div className="min-w-0 flex-1">
      <p className="text-white font-semibold text-sm line-clamp-2">{title}</p>
      {subtitle ? <p className="text-xs text-dryGray mt-1">{subtitle}</p> : null}
    </div>
  );

  return (
    <div className="bg-dry border border-border rounded-lg p-3 flex items-start gap-3">
      {href ? (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 hover:text-customPurple transitions"
        >
          {body}
        </Link>
      ) : (
        body
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="text-xs px-3 py-2 border border-customPurple text-customPurple rounded hover:bg-customPurple hover:text-white transition disabled:opacity-60"
      >
        Add
      </button>
    </div>
  );
}

export default function BlogPostEditorClient({ mode = 'create', postId = null }) {
  return (
    <RequireAdmin>
      {(user) => (
        <BlogPostEditorInner mode={mode} postId={postId} token={user.token} />
      )}
    </RequireAdmin>
  );
}

function BlogPostEditorInner({ mode, postId, token }) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const [currentPost, setCurrentPost] = useState(null);
  const [form, setForm] = useState(makeEmptyForm());

  const [movieSearch, setMovieSearch] = useState('');
  const [movieSearchLoading, setMovieSearchLoading] = useState(false);
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [resolvedRelatedMovies, setResolvedRelatedMovies] = useState([]);

  const [postSearch, setPostSearch] = useState('');
  const [postSearchLoading, setPostSearchLoading] = useState(false);
  const [postSearchResults, setPostSearchResults] = useState([]);
  const [resolvedRelatedPosts, setResolvedRelatedPosts] = useState([]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const relatedMovieIds = useMemo(
    () => splitCommaOrLines(form.relatedMovieIdsText),
    [form.relatedMovieIdsText]
  );

  const relatedPostIds = useMemo(
    () => splitCommaOrLines(form.relatedPostIdsText),
    [form.relatedPostIdsText]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isEdit) {
        setCurrentPost(null);
        setForm(makeEmptyForm());
        setBooting(false);
        return;
      }

      try {
        setBooting(true);

        const post = await getBlogPostAdmin(token, postId);

        if (!post) {
          toast.error('Blog post not found');
          router.replace('/blog-posts');
          return;
        }

        if (cancelled) return;

        setCurrentPost(post);

        setForm({
          title: post.title || '',
          categorySlug: post.categorySlug || BLOG_CATEGORIES[0]?.slug || '',
          templateType:
            post.templateType ||
            getBlogCategoryBySlug(post.categorySlug)?.templateType ||
            BLOG_CATEGORIES[0]?.templateType ||
            'list',

          coverImage: post.coverImage || '',
          coverImageAlt: post.coverImageAlt || '',
          excerpt: post.excerpt || '',
          intro: post.intro || '',
          quickAnswer: post.quickAnswer || '',

          sections:
            Array.isArray(post.sections) && post.sections.length
              ? post.sections.map((section) => ({
                heading: section?.heading || '',
                image: section?.image || '',
                imageAlt: section?.imageAlt || '',
                body: section?.body || '',
                movieLinkText: section?.movieLinkText || '',
                movieLinkUrl: section?.movieLinkUrl || '',
              }))
              : [emptySection()],

          faqs: Array.isArray(post.faqs)
            ? post.faqs.map((faq) => ({
              question: faq?.question || '',
              answer: faq?.answer || '',
            }))
            : [],

          tagsText: Array.isArray(post.tags) ? post.tags.join(', ') : '',
          relatedMovieIdsText: Array.isArray(post.relatedMovieIds)
            ? post.relatedMovieIds.map(String).join(', ')
            : '',
          relatedPostIdsText: Array.isArray(post.relatedPostIds)
            ? post.relatedPostIds.map(String).join(', ')
            : '',

          authorName: post.authorName || 'MovieFrost Editorial Team',

          seoTitle: post.seoTitle || '',
          seoDescription: post.seoDescription || '',
          seoKeywords: post.seoKeywords || '',

          isTrending: !!post.isTrending,
          isPublished: !!post.isPublished,
          publishedAt: toDateTimeLocalValue(post.publishedAt),
        });
      } catch (e) {
        toast.error(e?.message || 'Failed to load blog post');
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isEdit, token, postId, router]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!relatedMovieIds.length) {
        setResolvedRelatedMovies([]);
        return;
      }

      const rows = await Promise.all(
        relatedMovieIds.map(async (id) => {
          try {
            const movie = await getMovieByIdAdmin(token, id);

            if (!movie) {
              return {
                _id: String(id),
                title: String(id),
                subtitle: 'Movie ID (unresolved)',
                href: '',
              };
            }

            const href =
              movie?.isPublished !== false ? `/movie/${movie?.slug || movie?._id}` : '';

            const parts = [
              clean(movie?.type),
              movie?.year ? String(movie.year) : '',
              movie?.isPublished === false ? 'Draft' : 'Published',
            ].filter(Boolean);

            return {
              _id: String(movie?._id || id),
              title: clean(movie?.name || id),
              subtitle: parts.join(' • '),
              href,
            };
          } catch {
            return {
              _id: String(id),
              title: String(id),
              subtitle: 'Movie ID (unresolved)',
              href: '',
            };
          }
        })
      );

      if (!cancelled) setResolvedRelatedMovies(rows);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [token, relatedMovieIds]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!relatedPostIds.length) {
        setResolvedRelatedPosts([]);
        return;
      }

      const rows = await Promise.all(
        relatedPostIds.map(async (id) => {
          try {
            const post = await getBlogPostAdmin(token, id);

            if (!post) {
              return {
                _id: String(id),
                title: String(id),
                subtitle: 'Blog post ID (unresolved)',
                href: '',
              };
            }

            const href =
              post?.isPublished && post?.categorySlug && post?.slug
                ? buildBlogPostPath(post.categorySlug, post.slug)
                : `/blog-preview/${post?._id || id}`;

            const parts = [
              clean(post?.categoryTitle || post?.categorySlug),
              post?.isPublished ? 'Published' : 'Draft',
            ].filter(Boolean);

            return {
              _id: String(post?._id || id),
              title: clean(post?.title || id),
              subtitle: parts.join(' • '),
              href,
            };
          } catch {
            return {
              _id: String(id),
              title: String(id),
              subtitle: 'Blog post ID (unresolved)',
              href: '',
            };
          }
        })
      );

      if (!cancelled) setResolvedRelatedPosts(rows);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [token, relatedPostIds]);

  useEffect(() => {
    const term = clean(movieSearch);

    if (!token || term.length < 2) {
      setMovieSearchResults([]);
      setMovieSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setMovieSearchLoading(true);

        const data = await findMoviesByNamesAdmin(token, [term], {
          mode: 'contains',
          includeReviews: false,
        });

        if (cancelled) return;

        setMovieSearchResults(Array.isArray(data?.movies) ? data.movies.slice(0, 12) : []);
      } catch {
        if (!cancelled) setMovieSearchResults([]);
      } finally {
        if (!cancelled) setMovieSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, movieSearch]);

  useEffect(() => {
    const term = clean(postSearch);

    if (!token || term.length < 2) {
      setPostSearchResults([]);
      setPostSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setPostSearchLoading(true);

        const data = await getBlogPostsAdmin(token, {
          search: term,
          pageNumber: 1,
          limit: 12,
        });

        if (cancelled) return;

        setPostSearchResults(Array.isArray(data?.posts) ? data.posts : []);
      } catch {
        if (!cancelled) setPostSearchResults([]);
      } finally {
        if (!cancelled) setPostSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, postSearch]);

  const selectedCategory = useMemo(
    () =>
      getBlogCategoryBySlug(form.categorySlug) ||
      BLOG_CATEGORIES.find((item) => item.slug === form.categorySlug) ||
      BLOG_CATEGORIES[0] ||
      null,
    [form.categorySlug]
  );

  const templateGuide = useMemo(() => {
    const key = clean(form.templateType || selectedCategory?.templateType || 'list');
    return BLOG_TEMPLATE_GUIDES[key] || BLOG_TEMPLATE_GUIDES.list;
  }, [form.templateType, selectedCategory?.templateType]);

  const predictedSlug = useMemo(
    () => slugifySegment(form.title) || 'blog-post',
    [form.title]
  );

  const predictedCategorySlug = clean(form.categorySlug || selectedCategory?.slug);
  const predictedPublicPath = useMemo(
    () => buildBlogPostPath(predictedCategorySlug, predictedSlug),
    [predictedCategorySlug, predictedSlug]
  );

  const predictedCanonical = useMemo(
    () => buildBlogPostCanonical(predictedCategorySlug, predictedSlug),
    [predictedCategorySlug, predictedSlug]
  );

  const savedPublicPath =
    currentPost?.categorySlug && currentPost?.slug
      ? buildBlogPostPath(currentPost.categorySlug, currentPost.slug)
      : '';

  const draftPreviewHref = currentPost?._id ? `/blog-preview/${currentPost._id}` : '';

  const seoPreviewTitle = useMemo(() => {
    const fallback = `${clean(form.title || 'Untitled')} | MovieFrost Blog`;
    return trimText(clean(form.seoTitle) || fallback, 120);
  }, [form.title, form.seoTitle]);

  const seoPreviewDescription = useMemo(() => {
    const fallback =
      clean(form.seoDescription) ||
      clean(form.excerpt) ||
      clean(form.quickAnswer) ||
      clean(form.intro) ||
      clean(templateGuide.excerpt) ||
      'MovieFrost blog article preview.';
    return trimText(fallback, 160);
  }, [
    form.seoDescription,
    form.excerpt,
    form.quickAnswer,
    form.intro,
    templateGuide.excerpt,
  ]);

  const filteredMovieSearchResults = useMemo(() => {
    const selected = new Set(relatedMovieIds.map(String));
    return (Array.isArray(movieSearchResults) ? movieSearchResults : []).filter(
      (item) => !selected.has(String(item?._id || ''))
    );
  }, [movieSearchResults, relatedMovieIds]);

  const filteredPostSearchResults = useMemo(() => {
    const selected = new Set(relatedPostIds.map(String));
    const currentId = String(currentPost?._id || '');

    return (Array.isArray(postSearchResults) ? postSearchResults : []).filter((item) => {
      const id = String(item?._id || '');
      if (!id) return false;
      if (id === currentId) return false;
      return !selected.has(id);
    });
  }, [postSearchResults, relatedPostIds, currentPost?._id]);

  const updateIdsText = (field, ids = []) => {
    setField(field, uniqStrings(ids).join(', '));
  };

  const addRelatedMovie = (movie) => {
    const id = String(movie?._id || '').trim();
    if (!id) return;
    updateIdsText('relatedMovieIdsText', [...relatedMovieIds, id]);
  };

  const removeRelatedMovie = (id) => {
    updateIdsText(
      'relatedMovieIdsText',
      relatedMovieIds.filter((item) => String(item) !== String(id))
    );
  };

  const addRelatedPost = (post) => {
    const id = String(post?._id || '').trim();
    if (!id) return;

    const currentId = String(currentPost?._id || '');
    const next = [...relatedPostIds, id].filter((item) => item !== currentId);

    updateIdsText('relatedPostIdsText', next);
  };

  const removeRelatedPost = (id) => {
    updateIdsText(
      'relatedPostIdsText',
      relatedPostIds.filter((item) => String(item) !== String(id))
    );
  };

  const updateSection = (index, key, value) => {
    setForm((prev) => {
      const sections = Array.isArray(prev.sections) ? [...prev.sections] : [];
      sections[index] = {
        ...(sections[index] || emptySection()),
        [key]: value,
      };
      return { ...prev, sections };
    });
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...(Array.isArray(prev.sections) ? prev.sections : []), emptySection()],
    }));
  };

  const removeSection = (index) => {
    setForm((prev) => ({
      ...prev,
      sections: (Array.isArray(prev.sections) ? prev.sections : []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateFaq = (index, key, value) => {
    setForm((prev) => {
      const faqs = Array.isArray(prev.faqs) ? [...prev.faqs] : [];
      faqs[index] = {
        ...(faqs[index] || emptyFaq()),
        [key]: value,
      };
      return { ...prev, faqs };
    });
  };

  const addFaq = () => {
    setForm((prev) => ({
      ...prev,
      faqs: [...(Array.isArray(prev.faqs) ? prev.faqs : []), emptyFaq()],
    }));
  };

  const removeFaq = (index) => {
    setForm((prev) => ({
      ...prev,
      faqs: (Array.isArray(prev.faqs) ? prev.faqs : []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleCategoryChange = (slug) => {
    const category = getBlogCategoryBySlug(slug);

    setForm((prev) => ({
      ...prev,
      categorySlug: slug,
      templateType: category?.templateType || prev.templateType || 'list',
    }));
  };

  const applySuggestedStructure = () => {
    const ok = window.confirm(
      'This will replace current section headings with the recommended structure for this template. Continue?'
    );
    if (!ok) return;

    setForm((prev) => ({
      ...prev,
      excerpt: prev.excerpt || templateGuide.excerpt || '',
      quickAnswer: prev.quickAnswer || templateGuide.quickAnswer || '',
      sections: (templateGuide.sectionHeadings || []).map((heading) => ({
        heading,
        image: '',
        imageAlt: '',
        body: '',
        movieLinkText: '',
        movieLinkUrl: '',
      })),
      faqs:
        Array.isArray(prev.faqs) && prev.faqs.length
          ? prev.faqs
          : (templateGuide.faqQuestions || []).map((question) => ({
            question,
            answer: '',
          })),
    }));
  };

  const buildPayload = () => {
    const title = clean(form.title);
    if (!title) throw new Error('Title is required');

    const category = getBlogCategoryBySlug(form.categorySlug);
    if (!category) throw new Error('Select a valid blog category');

    const coverImage = clean(form.coverImage);
    if (!coverImage) throw new Error('Cover image is required');

    const intro = clean(form.intro);

    const sectionsDraft = Array.isArray(form.sections) ? form.sections : [];
    const normalizedSections = sectionsDraft
      .map((section) => ({
        heading: clean(section?.heading),
        image: clean(section?.image),
        imageAlt: clean(section?.imageAlt),
        body: clean(section?.body),
        movieLinkText: clean(section?.movieLinkText),
        movieLinkUrl: clean(section?.movieLinkUrl),
      }))
      .filter(
        (section) =>
          section.heading ||
          section.body ||
          section.image ||
          section.imageAlt ||
          section.movieLinkText ||
          section.movieLinkUrl
      );

    const invalidSection = normalizedSections.find((section) => {
      const hasAny =
        section.heading ||
        section.body ||
        section.image ||
        section.imageAlt ||
        section.movieLinkText ||
        section.movieLinkUrl;

      if (!hasAny) return false;
      if (!section.heading || !section.body) return true;

      if (
        (section.movieLinkText && !section.movieLinkUrl) ||
        (!section.movieLinkText && section.movieLinkUrl)
      ) {
        return true;
      }

      if (section.movieLinkUrl && !isValidLinkUrl(section.movieLinkUrl)) {
        return true;
      }

      return false;
    });

    if (invalidSection) {
      throw new Error(
        'Each section needs heading and body. If you add a movie link, add both title and URL, and the URL must start with /, http:// or https://.'
      );
    }

    const sections = normalizedSections
      .filter((section) => section.heading && section.body)
      .map((section) => ({
        heading: section.heading,
        image: section.image,
        imageAlt: section.image ? section.imageAlt : '',
        body: section.body,
        movieLinkText:
          section.movieLinkText && section.movieLinkUrl
            ? section.movieLinkText
            : '',
        movieLinkUrl:
          section.movieLinkText && section.movieLinkUrl
            ? section.movieLinkUrl
            : '',
      }))
      .slice(0, 50);

    const faqsDraft = Array.isArray(form.faqs) ? form.faqs : [];
    const normalizedFaqs = faqsDraft
      .map((faq) => ({
        question: clean(faq?.question),
        answer: clean(faq?.answer),
      }))
      .filter((faq) => faq.question || faq.answer);

    const partialFaq = normalizedFaqs.some(
      (faq) => (faq.question && !faq.answer) || (!faq.question && faq.answer)
    );

    if (partialFaq) {
      throw new Error('Each FAQ must have both question and answer (or remove it)');
    }

    const faqs = normalizedFaqs
      .filter((faq) => faq.question && faq.answer)
      .slice(0, 8);

    if (!intro && !sections.length) {
      throw new Error('Add intro or at least one complete section');
    }

    const templateType = BLOG_TEMPLATE_TYPES.includes(clean(form.templateType))
      ? clean(form.templateType)
      : category.templateType;

    let publishedAt = null;
    if (clean(form.publishedAt)) {
      const d = new Date(form.publishedAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error('Invalid published date');
      }
      publishedAt = d.toISOString();
    }

    return {
      title,
      categorySlug: category.slug,
      templateType,

      coverImage,
      coverImageAlt: clean(form.coverImageAlt),
      excerpt: clean(form.excerpt),
      intro,
      quickAnswer: clean(form.quickAnswer),

      sections,
      faqs,

      tags: splitCommaOrLines(form.tagsText),
      relatedMovieIds: relatedMovieIds,
      relatedPostIds: relatedPostIds.filter(
        (id) => id !== String(currentPost?._id || '')
      ),

      authorName: clean(form.authorName) || 'MovieFrost Editorial Team',

      seoTitle: clean(form.seoTitle),
      seoDescription: clean(form.seoDescription),
      seoKeywords: clean(form.seoKeywords),

      isTrending: !!form.isTrending,
      isPublished: !!form.isPublished,
      publishedAt,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const payload = buildPayload();
      setSaving(true);

      const saved = isEdit
        ? await updateBlogPostAdmin(token, postId, payload)
        : await createBlogPostAdmin(token, payload);

      setCurrentPost(saved);

      setForm((prev) => ({
        ...prev,
        categorySlug: saved?.categorySlug || prev.categorySlug,
        templateType: saved?.templateType || prev.templateType,
        publishedAt: toDateTimeLocalValue(saved?.publishedAt),
      }));

      toast.success(isEdit ? 'Blog post updated' : 'Blog post created');

      if (!isEdit && saved?._id) {
        router.replace(`/blog-posts/edit/${saved._id}`);
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateAsDraft = async () => {
    const ok = window.confirm(
      'Create a new duplicated draft from the current editor values?'
    );
    if (!ok) return;

    try {
      const payload = buildPayload();
      setDuplicating(true);

      const duplicated = await createBlogPostAdmin(token, {
        ...payload,
        title: trimText(`${payload.title} Copy`, 180),
        isPublished: false,
        isTrending: false,
        publishedAt: null,
      });

      toast.success('Draft duplicated successfully');

      if (duplicated?._id) {
        router.push(`/blog-posts/edit/${duplicated._id}`);
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to duplicate post');
    } finally {
      setDuplicating(false);
    }
  };

  if (booting) {
    return (
      <SideBarShell showSidebarAd sidebarAdKey="blog-editor-loading">
        <Loader />
      </SideBarShell>
    );
  }

  return (
    <SideBarShell
      showSidebarAd
      sidebarAdKey={isEdit ? `blog-editor-${postId}` : 'blog-create'}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {isEdit ? 'Edit Blog Post' : 'Create Blog Post'}
            </h2>
            <p className="text-sm text-dryGray mt-1">
              Build and manage blog articles with sections, FAQs, SEO fields, and publishing controls.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog-posts"
              className="border border-border hover:bg-main transition text-white px-4 py-2 rounded font-semibold text-sm"
            >
              Back to Posts
            </Link>

            {draftPreviewHref ? (
              <Link
                href={draftPreviewHref}
                target="_blank"
                rel="noreferrer"
                className="border border-border hover:bg-main transition text-white px-4 py-2 rounded font-semibold text-sm"
              >
                Preview Draft
              </Link>
            ) : null}

            {savedPublicPath && currentPost?.isPublished ? (
              <Link
                href={savedPublicPath}
                target="_blank"
                rel="noreferrer"
                className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-4 py-2 rounded font-semibold text-sm"
              >
                View Public Page
              </Link>
            ) : null}

            {isEdit ? (
              <button
                type="button"
                onClick={handleDuplicateAsDraft}
                disabled={duplicating}
                className="border border-border hover:bg-main transition text-white px-4 py-2 rounded font-semibold text-sm disabled:opacity-60"
              >
                {duplicating ? 'Duplicating...' : 'Duplicate as Draft'}
              </button>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </div>

        {isEdit && currentPost ? (
          <div className="bg-main border border-border rounded-lg p-4 text-sm">
            <div className="grid md:grid-cols-2 gap-3">
              <p className="text-dryGray">
                ID:{' '}
                <span className="text-white font-mono break-all">
                  {currentPost._id}
                </span>
              </p>

              <p className="text-dryGray">
                Saved slug:{' '}
                <span className="text-white font-mono break-all">
                  {currentPost.slug || '-'}
                </span>
              </p>

              <p className="text-dryGray">
                Public status:{' '}
                <span className="text-white">
                  {currentPost.isPublished ? 'Published' : 'Draft'}
                </span>
              </p>

              <p className="text-dryGray">
                Last saved publishedAt:{' '}
                <span className="text-white">
                  {currentPost.publishedAt
                    ? new Date(currentPost.publishedAt).toLocaleString()
                    : '-'}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid xl:grid-cols-2 gap-4">
          <div className="bg-main border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4">Slug & URL Preview</h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-dryGray">Predicted slug</p>
                <p className="text-white font-mono break-all mt-1">
                  {predictedSlug}
                </p>
              </div>

              <div>
                <p className="text-dryGray">Predicted public path</p>
                <p className="text-white font-mono break-all mt-1">
                  {predictedPublicPath}
                </p>
              </div>

              <div>
                <p className="text-dryGray">Predicted canonical</p>
                <p className="text-white font-mono break-all mt-1">
                  {predictedCanonical}
                </p>
              </div>

              {currentPost?.slug && currentPost.slug !== predictedSlug ? (
                <p className="text-xs text-dryGray">
                  Saved slug and predicted slug are different because your current editor title/category
                  changed. Final slug updates only after saving.
                </p>
              ) : null}

              <p className="text-xs text-dryGray">
                Final slug is generated by backend and may change if another post already uses the same title.
              </p>
            </div>
          </div>

          <div className="bg-main border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4">Live SEO Preview</h3>

            <div className="bg-dry border border-border rounded-lg p-4">
              <p className="text-[#8ab4f8] text-sm line-clamp-1">
                {predictedCanonical}
              </p>

              <h4 className="text-[#c58af9] text-lg leading-6 mt-1 line-clamp-2">
                {seoPreviewTitle || 'Blog title preview'}
              </h4>

              <p className="text-[#bdc1c6] text-sm mt-2 line-clamp-3">
                {seoPreviewDescription || 'SEO description preview'}
              </p>
            </div>

            <p className="text-xs text-dryGray mt-3">
              This preview updates live from SEO fields, excerpt, quick answer, and intro.
            </p>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4">Post Basics</h3>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm text-border font-semibold">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Interstellar Ending Explained"
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className="text-sm text-border font-semibold">Category *</label>
              <select
                value={form.categorySlug}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                {BLOG_CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.title}
                  </option>
                ))}
              </select>

              {selectedCategory ? (
                <p className="text-xs text-dryGray mt-2">
                  {selectedCategory.description}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm text-border font-semibold">Template Type *</label>
              <select
                value={form.templateType}
                onChange={(e) => setField('templateType', e.target.value)}
                className={`${inputClass} mt-2`}
              >
                {BLOG_TEMPLATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatBlogTemplateType(type)}
                  </option>
                ))}
              </select>

              <p className="text-xs text-dryGray mt-2">
                Category default: {formatBlogTemplateType(selectedCategory?.templateType || 'list')}
              </p>
            </div>

            <div>
              <label className="text-sm text-border font-semibold">Author Name</label>
              <input
                value={form.authorName}
                onChange={(e) => setField('authorName', e.target.value)}
                placeholder="MovieFrost Editorial Team"
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className="text-sm text-border font-semibold">Cover Image URL *</label>
              <input
                value={form.coverImage}
                onChange={(e) => setField('coverImage', e.target.value)}
                placeholder="https://cdn.moviefrost.com/uploads/..."
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className="text-sm text-border font-semibold">
                Cover Image Alt Text
              </label>
              <input
                value={form.coverImageAlt}
                onChange={(e) => setField('coverImageAlt', e.target.value)}
                placeholder="Describe the cover image for accessibility"
                className={`${inputClass} mt-2`}
              />
            </div>
          </div>

          <div className="mt-4">
            <Uploader
              setImageUrl={(url) => setField('coverImage', url)}
              compression={{
                targetSizeKB: 140,
                maxWidth: 1600,
                maxHeight: 900,
                mimeType: 'image/webp',
              }}
              buttonText="Upload Cover Image"
            />
          </div>

          {form.coverImage ? (
            <div className="mt-4">
              <img
                src={form.coverImage}
                alt={form.coverImageAlt || form.title || 'Blog cover preview'}
                className="w-full max-w-xl rounded border border-border object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/MOVIEFROST.png';
                }}
              />
            </div>
          ) : null}

          <p className="text-xs text-dryGray mt-3">
            If cover alt text is empty, the blog title will be used as the image alt fallback.
          </p>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4">Publishing</h3>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="flex flex-wrap gap-6 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.isPublished}
                  onChange={(e) => setField('isPublished', e.target.checked)}
                  className="accent-customPurple"
                />
                <span className="text-sm text-white">Published</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.isTrending}
                  onChange={(e) => setField('isTrending', e.target.checked)}
                  className="accent-customPurple"
                />
                <span className="text-sm text-white">Trending</span>
              </label>
            </div>

            <div>
              <label className="text-sm text-border font-semibold">
                Published At (optional)
              </label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(e) => setField('publishedAt', e.target.value)}
                className={`${inputClass} mt-2`}
              />
              <p className="text-xs text-dryGray mt-2">
                Leave empty to let backend auto-use the current time when publishing.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Template Guide</h3>
              <p className="text-sm text-dryGray mt-1">{templateGuide.purpose}</p>
            </div>

            <button
              type="button"
              onClick={applySuggestedStructure}
              className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-4 py-2 rounded font-semibold text-sm"
            >
              Use Suggested Structure
            </button>
          </div>

          <div className="grid xl:grid-cols-2 gap-4 mt-4">
            <div className="bg-dry border border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-white">Example Title</p>
              <p className="text-sm text-text mt-2">{templateGuide.exampleTitle}</p>

              <p className="text-sm font-semibold text-white mt-4">Quick Answer Idea</p>
              <p className="text-sm text-text mt-2">{templateGuide.quickAnswer}</p>
            </div>

            <div className="bg-dry border border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-white">Suggested Section Flow</p>
              <ol className="list-decimal ml-5 mt-2 text-sm text-text space-y-1">
                {(templateGuide.sectionHeadings || []).map((heading) => (
                  <li key={heading}>{heading}</li>
                ))}
              </ol>

              <p className="text-sm font-semibold text-white mt-4">
                FAQ Question Ideas
              </p>
              <ul className="list-disc ml-5 mt-2 text-sm text-text space-y-1">
                {(templateGuide.faqQuestions || []).map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-dry border border-border rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-white">Writing Tips</p>
            <ul className="list-disc ml-5 mt-2 text-sm text-text space-y-1">
              {(templateGuide.tips || []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4">Content</h3>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm text-border font-semibold">
                Excerpt (optional)
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setField('excerpt', e.target.value)}
                placeholder="Short summary for blog cards/search. Leave empty to auto-build from intro/sections."
                className={`${textareaClass} mt-2 min-h-[100px]`}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm text-border font-semibold">
                Intro *
              </label>
              <textarea
                value={form.intro}
                onChange={(e) => setField('intro', e.target.value)}
                placeholder="Intro paragraph. Backend requires intro or at least one complete section."
                className={`${textareaClass} mt-2 min-h-[160px]`}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm text-border font-semibold">
                Quick Answer (optional)
              </label>
              <textarea
                value={form.quickAnswer}
                onChange={(e) => setField('quickAnswer', e.target.value)}
                placeholder="Good for featured answer box / summary paragraph."
                className={`${textareaClass} mt-2 min-h-[120px]`}
              />
            </div>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Sections</h3>
              <p className="text-sm text-dryGray mt-1">
                Add up to 50 sections. Each section needs both heading and body. Section image is optional, alt text is supported, and you can add a beautiful movie link CTA below each section.
              </p>
            </div>

            <button
              type="button"
              onClick={addSection}
              className="bg-customPurple hover:bg-opacity-90 transition text-white px-4 py-2 rounded font-semibold text-sm"
            >
              Add Section
            </button>
          </div>

          <div className="space-y-4">
            {(Array.isArray(form.sections) ? form.sections : []).map((section, index) => (
              <div
                key={`section-${index}`}
                className="bg-dry border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="font-semibold text-white">Section {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="text-sm text-border font-semibold">
                      Heading *
                    </label>
                    <input
                      value={section.heading}
                      onChange={(e) =>
                        updateSection(index, 'heading', e.target.value)
                      }
                      placeholder="Section heading"
                      className={`${inputClass} mt-2`}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-border font-semibold">
                      Body *
                    </label>
                    <textarea
                      value={section.body}
                      onChange={(e) =>
                        updateSection(index, 'body', e.target.value)
                      }
                      placeholder="Section body"
                      className={`${textareaClass} mt-2 min-h-[180px]`}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-border font-semibold">
                        Optional Section Image URL
                      </label>
                      <input
                        value={section.image}
                        onChange={(e) =>
                          updateSection(index, 'image', e.target.value)
                        }
                        placeholder="https://cdn.moviefrost.com/uploads/..."
                        className={`${inputClass} mt-2`}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-border font-semibold">
                        Section Image Alt Text
                      </label>
                      <input
                        value={section.imageAlt}
                        onChange={(e) =>
                          updateSection(index, 'imageAlt', e.target.value)
                        }
                        placeholder="Describe this section image"
                        className={`${inputClass} mt-2`}
                      />
                    </div>
                  </div>

                  <div className="mt-1">
                    <Uploader
                      setImageUrl={(url) => updateSection(index, 'image', url)}
                      compression={{
                        targetSizeKB: 120,
                        maxWidth: 1600,
                        maxHeight: 1600,
                        mimeType: 'image/webp',
                      }}
                      buttonText="Upload Section Image"
                    />
                  </div>

                  {section.image ? (
                    <img
                      src={section.image}
                      alt={section.imageAlt || section.heading || `Section ${index + 1}`}
                      className="mt-1 w-full max-w-xl rounded border border-border object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/MOVIEFROST.png';
                      }}
                    />
                  ) : null}

                  <div className="bg-main border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Clever Movie Link Card (optional)
                        </p>
                        <p className="text-xs text-dryGray mt-1">
                          Add a highlighted movie CTA under this section. Use an internal path like{' '}
                          <code className="text-white">/movie/interstellar</code> or a full URL.
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-sm text-border font-semibold">
                          Movie Link Title
                        </label>
                        <input
                          value={section.movieLinkText}
                          onChange={(e) =>
                            updateSection(index, 'movieLinkText', e.target.value)
                          }
                          placeholder="e.g. Watch Interstellar"
                          className={`${inputClass} mt-2`}
                        />
                      </div>

                      <div>
                        <label className="text-sm text-border font-semibold">
                          Movie Link URL
                        </label>
                        <input
                          value={section.movieLinkUrl}
                          onChange={(e) =>
                            updateSection(index, 'movieLinkUrl', e.target.value)
                          }
                          placeholder="/movie/interstellar or https://..."
                          className={`${inputClass} mt-2`}
                        />
                      </div>
                    </div>

                    {section.movieLinkText && section.movieLinkUrl ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-customPurple/35 bg-gradient-to-r from-main via-[#0d1435] to-main">
                        <a
                          href={section.movieLinkUrl}
                          target={section.movieLinkUrl.startsWith('http') ? '_blank' : undefined}
                          rel={section.movieLinkUrl.startsWith('http') ? 'noreferrer' : undefined}
                          className="block p-4 sm:p-5 hover:opacity-95 transitions"
                        >
                          <p className="text-[11px] uppercase tracking-[0.18em] text-customPurple font-semibold">
                            Related Movie Link Preview
                          </p>
                          <h4 className="text-white font-semibold text-base sm:text-lg mt-1 line-clamp-2">
                            {section.movieLinkText}
                          </h4>
                          <p className="text-dryGray text-sm mt-1 break-all">
                            {section.movieLinkUrl}
                          </p>
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">FAQs</h3>
              <p className="text-sm text-dryGray mt-1">
                Optional. Add up to 8 FAQs. Each FAQ needs both question and answer.
              </p>
            </div>

            <button
              type="button"
              onClick={addFaq}
              className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-4 py-2 rounded font-semibold text-sm"
            >
              Add FAQ
            </button>
          </div>

          {Array.isArray(form.faqs) && form.faqs.length ? (
            <div className="space-y-4">
              {form.faqs.map((faq, index) => (
                <div
                  key={`faq-${index}`}
                  className="bg-dry border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="font-semibold text-white">FAQ {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm text-border font-semibold">
                        Question *
                      </label>
                      <input
                        value={faq.question}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        placeholder="FAQ question"
                        className={`${inputClass} mt-2`}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-border font-semibold">
                        Answer *
                      </label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        placeholder="FAQ answer"
                        className={`${textareaClass} mt-2 min-h-[120px]`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dryGray">No FAQs added yet.</p>
          )}
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4">Related Content</h3>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-border font-semibold">
                  Search Related Movies
                </label>
                <input
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  placeholder="Type movie name..."
                  className={`${inputClass} mt-2`}
                />
                <p className="text-xs text-dryGray mt-2">
                  Uses your existing admin movie lookup and lets you add movie IDs without pasting manually.
                </p>
              </div>

              {movieSearchLoading ? (
                <p className="text-sm text-dryGray">Searching movies...</p>
              ) : filteredMovieSearchResults.length ? (
                <div className="space-y-2">
                  {filteredMovieSearchResults.map((movie) => (
                    <SearchResultCard
                      key={movie?._id}
                      title={clean(movie?.name || 'Movie')}
                      subtitle={[
                        clean(movie?.type),
                        movie?.year ? String(movie.year) : '',
                        movie?.isPublished === false ? 'Draft' : 'Published',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                      href={
                        movie?.isPublished !== false
                          ? `/movie/${movie?.slug || movie?._id}`
                          : ''
                      }
                      onAdd={() => addRelatedMovie(movie)}
                    />
                  ))}
                </div>
              ) : clean(movieSearch).length >= 2 ? (
                <p className="text-sm text-dryGray">No matching movies found.</p>
              ) : null}

              <div>
                <p className="text-sm text-white font-semibold">
                  Selected Related Movies ({relatedMovieIds.length})
                </p>

                {resolvedRelatedMovies.length ? (
                  <div className="space-y-2 mt-3">
                    {resolvedRelatedMovies.map((movie) => (
                      <SelectedRelationCard
                        key={movie._id}
                        title={movie.title}
                        subtitle={movie.subtitle}
                        href={movie.href}
                        onRemove={() => removeRelatedMovie(movie._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-dryGray mt-2">No related movies selected.</p>
                )}
              </div>

              <details className="bg-dry border border-border rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-semibold text-white">
                  Advanced: Edit Movie IDs Manually
                </summary>
                <textarea
                  value={form.relatedMovieIdsText}
                  onChange={(e) => setField('relatedMovieIdsText', e.target.value)}
                  placeholder="comma or new line separated Mongo ObjectIds"
                  className={`${textareaClass} mt-3 min-h-[90px]`}
                />
              </details>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-border font-semibold">
                  Search Related Blog Posts
                </label>
                <input
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  placeholder="Type blog title..."
                  className={`${inputClass} mt-2`}
                />
                <p className="text-xs text-dryGray mt-2">
                  Search your admin blog posts list and add internal related article links quickly.
                </p>
              </div>

              {postSearchLoading ? (
                <p className="text-sm text-dryGray">Searching blog posts...</p>
              ) : filteredPostSearchResults.length ? (
                <div className="space-y-2">
                  {filteredPostSearchResults.map((post) => (
                    <SearchResultCard
                      key={post?._id}
                      title={clean(post?.title || 'Blog post')}
                      subtitle={[
                        clean(post?.categoryTitle || post?.categorySlug),
                        post?.isPublished ? 'Published' : 'Draft',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                      href={
                        post?.isPublished && post?.categorySlug && post?.slug
                          ? buildBlogPostPath(post.categorySlug, post.slug)
                          : `/blog-preview/${post?._id}`
                      }
                      onAdd={() => addRelatedPost(post)}
                    />
                  ))}
                </div>
              ) : clean(postSearch).length >= 2 ? (
                <p className="text-sm text-dryGray">No matching blog posts found.</p>
              ) : null}

              <div>
                <p className="text-sm text-white font-semibold">
                  Selected Related Blog Posts ({relatedPostIds.length})
                </p>

                {resolvedRelatedPosts.length ? (
                  <div className="space-y-2 mt-3">
                    {resolvedRelatedPosts.map((post) => (
                      <SelectedRelationCard
                        key={post._id}
                        title={post.title}
                        subtitle={post.subtitle}
                        href={post.href}
                        onRemove={() => removeRelatedPost(post._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-dryGray mt-2">No related blog posts selected.</p>
                )}
              </div>

              <details className="bg-dry border border-border rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-semibold text-white">
                  Advanced: Edit Blog Post IDs Manually
                </summary>
                <textarea
                  value={form.relatedPostIdsText}
                  onChange={(e) => setField('relatedPostIdsText', e.target.value)}
                  placeholder="comma or new line separated Mongo ObjectIds"
                  className={`${textareaClass} mt-3 min-h-[90px]`}
                />
              </details>
            </div>
          </div>

          <div className="mt-4 bg-dry border border-border rounded-lg p-4">
            <label className="text-sm text-border font-semibold">Tags</label>
            <textarea
              value={form.tagsText}
              onChange={(e) => setField('tagsText', e.target.value)}
              placeholder="interstellar, ending explained, christopher nolan"
              className={`${textareaClass} mt-2 min-h-[100px]`}
            />
            <p className="text-xs text-dryGray mt-2">
              Use comma or new line separated tags.
            </p>
          </div>
        </div>

        <div className="bg-main border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4">SEO Fields</h3>

          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-border font-semibold">
                SEO Title
              </label>
              <input
                value={form.seoTitle}
                onChange={(e) => setField('seoTitle', e.target.value)}
                placeholder="Leave empty to use default"
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className="text-sm text-border font-semibold">
                SEO Keywords
              </label>
              <input
                value={form.seoKeywords}
                onChange={(e) => setField('seoKeywords', e.target.value)}
                placeholder="keyword 1, keyword 2, keyword 3"
                className={`${inputClass} mt-2`}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm text-border font-semibold">
                SEO Description
              </label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => setField('seoDescription', e.target.value)}
                placeholder="Leave empty to use excerpt/intro based fallback"
                className={`${textareaClass} mt-2 min-h-[120px]`}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Blog Post' : 'Create Blog Post'}
        </button>
      </form>
    </SideBarShell>
  );
}
