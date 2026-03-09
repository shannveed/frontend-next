// frontend-next/src/app/dmca/page.jsx
import LegalPageLayout, {
  LegalSection,
} from '../../components/pages/LegalPageLayout';
import { SITE_URL } from '../../lib/seo';

export const metadata = {
  title: 'DMCA',
  description:
    'MovieFrost DMCA policy and copyright complaint process.',
  alternates: { canonical: `${SITE_URL}/dmca` },
};

export default function DmcaPage() {
  return (
    <LegalPageLayout
      title="DMCA Policy"
      intro="MovieFrost respects the intellectual property rights of others and responds to valid copyright notices in accordance with applicable law."
    >
      <LegalSection title="1. Third-party content notice">
        <p>
          MovieFrost does <strong>not host video files on its own servers</strong>.
          The platform may display, embed, or link to content made available by
          third-party sources. Images and metadata may be stored for indexing,
          presentation, and site functionality, but streaming sources are not
          uploaded or stored by MovieFrost.
        </p>
      </LegalSection>

      <LegalSection title="2. How to submit a copyright complaint">
        <p>
          If you believe that material available through MovieFrost infringes your
          copyright, please send a written notice to:
        </p>

        <p className="mt-3">
          <a
            href="mailto:support@moviefrost.com"
            className="text-customPurple hover:underline"
          >
            support@moviefrost.com
          </a>
        </p>

        <p className="mt-3">Please include:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Your full legal name and contact information.</li>
          <li>A description of the copyrighted work.</li>
          <li>
            The exact URL(s) on MovieFrost where the allegedly infringing material
            appears.
          </li>
          <li>
            A statement that you have a good-faith belief that the use is not
            authorized.
          </li>
          <li>
            A statement that the information in your notice is accurate and that
            you are authorized to act on behalf of the copyright owner.
          </li>
          <li>Your physical or electronic signature.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Response process">
        <p>
          After receiving a valid complaint, MovieFrost may remove or disable
          access to the reported page, link, embed, thumbnail, or metadata while
          the issue is reviewed. Repeated complaints may also result in additional
          restrictions.
        </p>
      </LegalSection>

      <LegalSection title="4. Counter notice">
        <p>
          If you believe content was removed in error, you may send a counter
          notice with sufficient legal detail and contact information. We may
          restore access when appropriate and when permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="5. Repeat infringement policy">
        <p>
          MovieFrost reserves the right to restrict, remove, or permanently block
          pages, links, submissions, or user access in cases of repeat or abusive
          infringement claims.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
