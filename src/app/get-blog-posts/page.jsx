// frontend-next/src/app/get-blog-posts/page.jsx
import GetBlogPostsClient from '../../components/dashboard/GetBlogPostsClient';

export const metadata = {
  title: 'Get Blog Posts',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GetBlogPostsClient />;
}
