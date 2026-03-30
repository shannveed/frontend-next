// frontend-next/src/lib/blogSeo.js
import { absoluteUrl, clean, SITE_URL, truncate } from './seo';
import {
  buildBlogCategoryCanonical,
  buildBlogHomeCanonical,
  buildBlogPostCanonical,
  buildBlogTrendingCanonical,
  getBlogCategoryBySlug,
} from './blogCategories';

const toIso = (value) => {
  if (!value) return undefined;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;

  return d.toISOString();
};

const normalizeFaqs = (faqs = []) =>
  (Array.isArray(faqs) ? faqs : [])
    .map((faq) => ({
      question: clean(faq?.question),
      answer: clean(faq?.answer),
    }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, 8);

export const buildBlogHomeMetadata = () => ({
  title: 'Blog',
  description: truncate(
    'Read trending movie articles, reviews, ending explained guides, recommendation lists, and upcoming movie updates on MovieFrost.',
    160
  ),
  canonical: buildBlogHomeCanonical(),
});

export const buildBlogTrendingMetadata = () => ({
  title: 'Trending Articles',
  description: truncate(
    'Browse trending movie articles, reviews, explainers, and recommendation guides on MovieFrost Blog.',
    160
  ),
  canonical: buildBlogTrendingCanonical(),
});

export const buildBlogCategoryMetadata = (category) => {
  const title = clean(category?.title || 'Blog Category');
  const description = clean(category?.description || 'MovieFrost blog category.');

  return {
    title,
    description: truncate(`${description} Read the latest articles on MovieFrost Blog.`, 160),
    canonical: buildBlogCategoryCanonical(category?.slug || ''),
  };
};

export const buildBlogPostMetadata = (post) => {
  const canonical = buildBlogPostCanonical(post?.categorySlug, post?.slug);

  const image = absoluteUrl(post?.coverImage || '/images/MOVIEFROST.png');

  const title = truncate(
    clean(post?.seoTitle || `${post?.title || 'Blog Post'} | MovieFrost Blog`),
    100
  );

  const description = truncate(
    clean(post?.seoDescription || post?.excerpt || post?.intro || ''),
    160
  );

  return {
    title,
    description,
    canonical,
    image,
  };
};

export const buildBlogBreadcrumbJsonLd = (post, categoryInput = null) => {
  const category =
    categoryInput ||
    getBlogCategoryBySlug(post?.categorySlug) || {
      slug: clean(post?.categorySlug),
      title: clean(post?.categoryTitle || 'Blog'),
    };

  const canonical = buildBlogPostCanonical(post?.categorySlug, post?.slug);

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: buildBlogHomeCanonical(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.title,
        item: buildBlogCategoryCanonical(category.slug),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: clean(post?.title || 'Blog Post'),
        item: canonical,
      },
    ],
  };
};

export const buildBlogFaqJsonLd = (post) => {
  const canonical = buildBlogPostCanonical(post?.categorySlug, post?.slug);
  const faqs = normalizeFaqs(post?.faqs);

  if (!faqs.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faqs.map((faq, idx) => ({
      '@type': 'Question',
      '@id': `${canonical}#faq-question-${idx + 1}`,
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};

export const buildBlogArticleGraphJsonLd = (post, categoryInput = null) => {
  const category =
    categoryInput ||
    getBlogCategoryBySlug(post?.categorySlug) || {
      slug: clean(post?.categorySlug),
      title: clean(post?.categoryTitle || 'Blog'),
    };

  const canonical = buildBlogPostCanonical(post?.categorySlug, post?.slug);
  const pageId = `${canonical}#webpage`;
  const articleId = `${canonical}#article`;
  const orgId = `${SITE_URL}#organization`;
  const websiteId = `${SITE_URL}#website`;

  const image = absoluteUrl(post?.coverImage || '/images/MOVIEFROST.png');
  const datePublished = toIso(post?.publishedAt || post?.createdAt);
  const dateModified = toIso(post?.updatedAt || post?.publishedAt || post?.createdAt);

  const keywordList = clean(post?.seoKeywords)
    ? clean(post.seoKeywords)
    : Array.isArray(post?.tags)
      ? post.tags.map(clean).filter(Boolean).join(', ')
      : '';

  const sectionTitles = Array.isArray(post?.sections)
    ? post.sections.map((section) => clean(section?.heading)).filter(Boolean)
    : [];

  const faqNode = buildBlogFaqJsonLd(post);
  const breadcrumb = buildBlogBreadcrumbJsonLd(post, category);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'MovieFrost',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/images/MOVIEFROST.png'),
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'MovieFrost',
        url: SITE_URL,
        publisher: { '@id': orgId },
      },
      {
        '@type': 'WebPage',
        '@id': pageId,
        url: canonical,
        name: clean(post?.title || 'Blog Post'),
        isPartOf: { '@id': websiteId },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
        ...(faqNode ? { hasPart: [{ '@id': faqNode['@id'] }] } : {}),
      },
      breadcrumb,
      {
        '@type': 'Article',
        '@id': articleId,
        headline: clean(post?.title || 'Blog Post'),
        description: clean(
          post?.seoDescription || post?.excerpt || post?.intro || ''
        ),
        image: image ? [image] : undefined,
        url: canonical,
        mainEntityOfPage: { '@id': pageId },
        author: {
          '@type': 'Person',
          name: clean(post?.authorName || 'MovieFrost Editorial Team'),
        },
        publisher: { '@id': orgId },
        datePublished,
        dateModified,
        articleSection: [category.title, ...sectionTitles],
        keywords: keywordList || undefined,
        inLanguage: 'en',
        isAccessibleForFree: true,
      },
      ...(faqNode ? [faqNode] : []),
    ],
  };
};
