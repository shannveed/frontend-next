// src/app/contact-us/page.jsx
import Link from 'next/link';
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import ContactFormClient from '../../components/pages/ContactFormClient';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'Contact Us',
  description:
    'Contact MovieFrost support. We are here to help you with streaming and website issues.',
  alternates: { canonical: `${SITE_URL}/contact-us` },
};

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-main border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-customPurple/20 border border-customPurple flex items-center justify-center">
          <Icon className="text-customPurple" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold">{title}</p>
          <div className="text-sm text-text mt-1 break-words">{children}</div>
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({ href, title, children }) {
  return (
    <Link
      href={href}
      className="bg-main border border-border rounded-lg p-4 hover:border-customPurple transition"
    >
      <p className="text-white font-semibold">{title}</p>
      <p className="text-dryGray text-sm mt-1">{children}</p>
    </Link>
  );
}

export default function ContactPage() {
  return (
    <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
      <div className="bg-dry border border-border rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Contact Us</h1>
        <p className="text-text mt-2 text-sm sm:text-base">
          Need help or want to report an issue? Reach us using the details below
          or send a message.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          <div className="space-y-4">
            <InfoCard icon={FaEnvelope} title="Email">
              <a
                href="mailto:support@moviefrost.com"
                className="text-customPurple hover:underline"
              >
                support@moviefrost.com
              </a>
            </InfoCard>

            <InfoCard icon={FaPhoneAlt} title="Phone">
              <span className="text-white/90">+9714-2261242</span>
            </InfoCard>

            <InfoCard icon={FaMapMarkerAlt} title="Address">
              <span className="text-white/90">Box No. 76706, Dubai, UAE</span>
            </InfoCard>

            <div className="bg-main border border-border rounded-lg p-4">
              <p className="text-white font-semibold">Quick Tips</p>
              <ul className="mt-2 text-sm text-text list-disc ml-5 space-y-1">
                <li>Send the movie name + page link if you’re reporting an issue.</li>
                <li>For watch-link requests, use the “Request Movie” popup in the site.</li>
                <li>For copyright issues, please use the DMCA page listed below.</li>
              </ul>
            </div>
          </div>

          <ContactFormClient />
        </div>

        {/* ✅ Q2: contact/legal links live here instead of navbar */}
        <div className="mt-8 bg-main border border-border rounded-lg p-5">
          <p className="text-white font-semibold">Support & Legal Pages</p>
          <p className="text-dryGray text-sm mt-1">
            Quick access to important support and legal information.
          </p>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
            <QuickLinkCard href="/contact-us" title="Contact Us">
              Support email, phone details, and contact form.
            </QuickLinkCard>

            <QuickLinkCard href="/dmca" title="DMCA">
              Copyright complaints and content removal requests.
            </QuickLinkCard>

            <QuickLinkCard href="/privacy-policy" title="Privacy Policy">
              How information is collected, used, and protected.
            </QuickLinkCard>

            <QuickLinkCard href="/terms-of-service" title="Terms of Service">
              Rules and conditions for using MovieFrost.
            </QuickLinkCard>
          </div>
        </div>
      </div>
    </div>
  );
}
