// frontend-next/src/app/privacy-policy/page.jsx
import LegalPageLayout, {
  LegalSection,
} from '../../components/pages/LegalPageLayout';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'MovieFrost privacy policy explaining what information we collect and how we use it.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      intro="This Privacy Policy explains how MovieFrost may collect, use, and protect information when you browse the website, create an account, save favorites, submit ratings, or enable notifications."
    >
      <LegalSection title="1. Information we may collect">
        <ul className="list-disc ml-5 space-y-1">
          <li>Account details such as name, email, and profile image.</li>
          <li>Favorites, ratings, comments, and watch requests you submit.</li>
          <li>Device/browser information and basic usage logs.</li>
          <li>Push subscription data if you enable web notifications.</li>
          <li>Cookies or similar storage used for login and preferences.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <ul className="list-disc ml-5 space-y-1">
          <li>To provide account features and site functionality.</li>
          <li>To save favorites, ratings, and profile settings.</li>
          <li>To deliver notification replies and platform updates.</li>
          <li>To improve performance, UX, and content discovery.</li>
          <li>To detect abuse, spam, fraud, or unauthorized activity.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Cookies and local storage">
        <p>
          MovieFrost may use cookies, browser storage, and similar technologies to
          keep you logged in, remember preferences, cache data, and improve site
          performance.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-party services">
        <p>
          The site may use third-party services such as analytics, Google login,
          push delivery providers, email delivery providers, image/CDN services,
          advertising partners, and external movie metadata providers. Those
          third-party services may process data according to their own policies.
        </p>
      </LegalSection>

      <LegalSection title="5. Data security">
        <p>
          We use reasonable technical and administrative measures to protect
          stored information. However, no internet-based system can be guaranteed
          to be 100% secure.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices">
        <ul className="list-disc ml-5 space-y-1">
          <li>You can update your profile information from your account page.</li>
          <li>You can clear favorites and manage your ratings.</li>
          <li>You can disable push notifications in your browser settings.</li>
          <li>You may request account deletion if applicable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          For privacy questions, contact{' '}
          <a
            href="mailto:support@moviefrost.com"
            className="text-customPurple hover:underline"
          >
            support@moviefrost.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
