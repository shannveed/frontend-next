// frontend-next/src/app/terms-of-service/page.jsx
import LegalPageLayout, {
  LegalSection,
} from '../../components/pages/LegalPageLayout';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'Terms of Service',
  description:
    'MovieFrost terms of service and usage rules.',
  alternates: { canonical: `${SITE_URL}/terms-of-service` },
};

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      intro="By accessing or using MovieFrost, you agree to these Terms of Service. If you do not agree, please discontinue use of the website."
    >
      <LegalSection title="1. Use of the website">
        <p>
          MovieFrost is provided for browsing, discovering, and interacting with
          movie and web-series listings. You agree not to misuse the website,
          interfere with its operation, or attempt unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and user content">
        <p>
          If you create an account, you are responsible for the accuracy of your
          information and for activity under your account. Ratings, comments, and
          requests submitted by users must not be unlawful, abusive, or spammy.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-party links and sources">
        <p>
          MovieFrost may link to, embed, or reference third-party sources.
          MovieFrost does not guarantee the availability, legality, quality, or
          safety of third-party websites and does not host third-party streaming
          files on its own servers.
        </p>
      </LegalSection>

      <LegalSection title="4. Intellectual property">
        <p>
          Site branding, design, code, logos, and original platform content are
          the property of MovieFrost or their respective owners. Unauthorized
          copying, scraping, re-publication, or commercial reuse is prohibited
          unless permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability and changes">
        <p>
          MovieFrost may modify, suspend, remove, or update features, pages,
          links, categories, or policies at any time without prior notice.
        </p>
      </LegalSection>

      <LegalSection title="6. Disclaimer and limitation of liability">
        <p>
          The website is provided on an “as is” and “as available” basis.
          MovieFrost makes no guarantee that the service will always be available,
          error-free, secure, or suitable for a particular purpose.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          For terms-related questions, contact{' '}
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
