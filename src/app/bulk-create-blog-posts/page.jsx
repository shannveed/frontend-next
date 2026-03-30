// frontend-next/src/app/bulk-create-blog-posts/page.jsx
import BulkCreateBlogPostsClient from '../../components/dashboard/BulkCreateBlogPostsClient';

export const metadata = {
  title: 'Bulk Create Blog Posts',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BulkCreateBlogPostsClient />;
}
