// frontend-next/src/app/blog-posts/edit/[id]/page.jsx
import BlogPostEditorClient from '@/components/dashboard/BlogPostEditorClient';

export const metadata = {
  title: 'Edit Blog Post',
  robots: { index: false, follow: false },
};

export default function Page({ params }) {
  return <BlogPostEditorClient mode="edit" postId={params.id} />;
}
