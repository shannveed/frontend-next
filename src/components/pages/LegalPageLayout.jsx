// frontend-next/src/components/pages/LegalPageLayout.jsx
import React from 'react';
import Link from 'next/link';

export function LegalSection({ title, children }) {
  return (
    <section className="bg-main border border-border rounded-lg p-5">
      <h2 className="text-white font-semibold text-lg">{title}</h2>
      <div className="text-text text-sm mt-3 leading-7">{children}</div>
    </section>
  );
}

export default function LegalPageLayout({
  title,
  intro,
  lastUpdated = 'March 9, 2026',
  children,
}) {
  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <div className="bg-dry border border-border rounded-lg p-6 sm:p-8">
        <p className="text-customPurple text-xs font-semibold uppercase tracking-wide">
          Legal & Trust
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
          {title}
        </h1>

        <p className="text-dryGray text-sm mt-2">Last updated: {lastUpdated}</p>

        {intro ? (
          <p className="text-text mt-4 leading-7 text-sm sm:text-base">{intro}</p>
        ) : null}

        <div className="space-y-5 mt-8">{children}</div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/contact-us"
            className="bg-main border border-border rounded-lg p-4 hover:border-customPurple transition"
          >
            <p className="text-white font-semibold">Contact Us</p>
            <p className="text-dryGray text-sm mt-1">
              Support details and message form.
            </p>
          </Link>

          <Link
            href="/dmca"
            className="bg-main border border-border rounded-lg p-4 hover:border-customPurple transition"
          >
            <p className="text-white font-semibold">DMCA</p>
            <p className="text-dryGray text-sm mt-1">
              Copyright complaints and removal requests.
            </p>
          </Link>

          <Link
            href="/privacy-policy"
            className="bg-main border border-border rounded-lg p-4 hover:border-customPurple transition"
          >
            <p className="text-white font-semibold">Privacy Policy</p>
            <p className="text-dryGray text-sm mt-1">
              How data is collected, used, and protected.
            </p>
          </Link>

          <Link
            href="/terms-of-service"
            className="bg-main border border-border rounded-lg p-4 hover:border-customPurple transition"
          >
            <p className="text-white font-semibold">Terms of Service</p>
            <p className="text-dryGray text-sm mt-1">
              Rules and conditions for using MovieFrost.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
