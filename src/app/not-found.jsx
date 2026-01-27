import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-3xl font-bold">404 — Page Not Found</h1>
      <p className="text-text mt-3">The page you are looking for does not exist.</p>
      <Link href="/" className="inline-block mt-6 bg-customPurple px-5 py-3 rounded font-semibold">
        Back Home
      </Link>
    </div>
  );
}
