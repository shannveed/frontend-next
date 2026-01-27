// src/app/contact-us/page.jsx
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import ContactFormClient from '../../components/pages/ContactFormClient';

export const metadata = {
  title: 'Contact Us',
  description:
    'Contact MovieFrost support. We are here to help you with streaming and website issues.',
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
          {/* Left: contact info */}
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
              </ul>
            </div>
          </div>

          {/* Right: form (client) */}
          <ContactFormClient />
        </div>
      </div>
    </div>
  );
}
