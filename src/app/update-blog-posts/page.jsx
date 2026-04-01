// frontend-next/src/app/update-blog-posts/page.jsx
import UpdateBlogPostsClient from '../../components/dashboard/UpdateBlogPostsClient';

export const metadata = {
  title: 'Update Blog Posts',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <UpdateBlogPostsClient />;
}
