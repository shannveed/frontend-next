// frontend-next/src/app/blog-posts/create/page.jsx
import BlogPostEditorClient from '@/components/dashboard/BlogPostEditorClient';

export const metadata = {
  title: 'Create Blog Post',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BlogPostEditorClient mode="create" />;
}
