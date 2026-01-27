// src/app/about-us/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'About Us',
  description:
    'Learn about MovieFrost — a free platform to discover and watch movies and web series online in HD.',
};

function Card({ title, children }) {
  return (
    <div className="bg-main border border-border rounded-lg p-5">
      <h2 className="text-white font-semibold text-lg">{title}</h2>
      <div className="text-text text-sm mt-2 leading-7">{children}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <div className="bg-dry border border-border rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          About MovieFrost
        </h1>

        <p className="text-text mt-3 leading-7">
          MovieFrost helps users discover and enjoy movies and web series online.
          We focus on fast loading, mobile-friendly UI, and clean SEO so content
          is easy to find.
        </p>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <Card title="What you can do on MovieFrost">
            <ul className="list-disc ml-5 space-y-1">
              <li>Browse movies by category, language, year, and “Browse By”.</li>
              <li>Watch with multiple servers (Server 1 / 2 / 3).</li>
              <li>Rate movies and leave short comments.</li>
              <li>Request a movie/web series and get the link in notifications.</li>
              <li>Install as a PWA and receive push updates (optional).</li>
            </ul>
          </Card>

          <Card title="Our mission">
            <p>
              Our mission is to deliver a smooth streaming experience with a
              modern design, powerful admin tools, and SEO-ready pages.
            </p>
            <p className="mt-3">
              MovieFrost is built using the MERN stack with a Next.js SEO layer
              to improve indexing and performance.
            </p>
          </Card>
        </div>

        <div className="mt-8">
          <Card title="Need help?">
            <p>
              If you want to report an issue or contact support, visit our
              Contact page.
            </p>
            <Link
              href="/contact-us"
              className="inline-block mt-3 bg-customPurple hover:bg-opacity-90 transition text-white px-5 py-3 rounded font-semibold"
            >
              Contact Us
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
