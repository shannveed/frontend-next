// frontend-next/src/app/blog-posts/page.jsx
import BlogPostsClient from '@/components/dashboard/BlogPostsClient';

export const metadata = {
  title: 'Blog Posts',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BlogPostsClient />;
}
