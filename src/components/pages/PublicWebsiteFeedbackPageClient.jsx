// frontend-next/src/components/pages/PublicWebsiteFeedbackPageClient.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

import { submitWebsiteFeedback } from '../../lib/client/websiteFeedback';
import { getCountryOptions } from '../../data/countries';
import { FEEDBACK_MODAL_OPEN_CHANGE_EVENT } from '../../lib/events';

const ACTIVE_MS_KEY = 'mf_feedback_active_ms_v1';
const LAST_SUBMITTED_AT_KEY = 'mf_feedback_last_submitted_at_v1';
const DISMISSED_SESSION_KEY = 'mf_feedback_dismissed_this_session_v1';
const RETURN_PATH_SESSION_KEY = 'mf_feedback_return_path_v1';

const QUALITY_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'];

const VISIT_FREQUENCY_OPTIONS = [
  'Daily',
  'Within three days',
  'Weekly',
  'Twice a month',
  'Monthly',
];

const OVERALL_LABELS = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

const makeEmptyForm = () => ({
  overallExperience: '',
  findingEase: '',
  loadingSpeed: '',
  streamingQuality: '',
  missingTitles: '',
  missingFeatures: '',
  country: '',
  visitFrequency: '',
  recommendScore: '',
  oneImprovement: '',
});

const clean = (value = '') => String(value ?? '').trim();

const normalizeInternalReturnPath = (value = '') => {
  const path = clean(value);

  if (!path) return '';
  if (!path.startsWith('/')) return '';
  if (path.startsWith('//')) return '';

  if (
    path === '/feedback' ||
    path.startsWith('/feedback?') ||
    path.startsWith('/feedback#') ||
    path.startsWith('/feedback/')
  ) {
    return '';
  }

  return path;
};

const getStoredFeedbackReturnPath = () => {
  try {
    return normalizeInternalReturnPath(
      sessionStorage.getItem(RETURN_PATH_SESSION_KEY) || ''
    );
  } catch {
    return '';
  }
};

const clearStoredFeedbackReturnPath = () => {
  try {
    sessionStorage.removeItem(RETURN_PATH_SESSION_KEY);
  } catch {
    // ignore
  }
};

const getSameOriginReferrerPath = () => {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return '';
    }

    const ref = clean(document.referrer);
    if (!ref) return '';

    const u = new URL(ref);

    if (u.origin !== window.location.origin) return '';

    return normalizeInternalReturnPath(`${u.pathname}${u.search}${u.hash}`);
  } catch {
    return '';
  }
};

/**
 * Keep same global class/event used by ad components.
 * On this feedback page, all MovieFrost ad slots are force-hidden and popunder
 * scripts are not mounted by SiteChromeRuntime.
 */
const setFeedbackDomState = (isOpen) => {
  const open = !!isOpen;

  try {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle(
        'mf-feedback-modal-open',
        open
      );

      document.body.classList.toggle('mf-feedback-modal-open', open);

      if (open) {
        document.documentElement.dataset.mfFeedbackModalOpen = 'true';
        document.body.dataset.mfFeedbackModalOpen = 'true';
      } else {
        delete document.documentElement.dataset.mfFeedbackModalOpen;
        delete document.body.dataset.mfFeedbackModalOpen;
      }
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FEEDBACK_MODAL_OPEN_CHANGE_EVENT, {
          detail: { open },
        })
      );
    }
  } catch {
    // ignore
  }
};

function ScaleButtons({
  value,
  onChange,
  min = 1,
  max = 5,
  labels = {},
  compact = false,
}) {
  const values = [];
  for (let i = min; i <= max; i += 1) values.push(i);

  return (
    <div
      className={`grid gap-2 ${compact ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5'
        }`}
    >
      {values.map((n) => {
        const active = Number(value) === n;

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded-lg border px-2 py-3 text-center transitions ${active
                ? 'bg-customPurple border-customPurple text-white'
                : 'bg-main border-border text-white hover:border-customPurple'
              }`}
          >
            <span className="flex items-center justify-center gap-1 text-sm font-bold">
              {max === 5 ? <FaStar className="text-star" /> : null}
              {n}
            </span>

            {labels[n] ? (
              <span className="mt-1 block text-[10px] leading-tight text-text">
                {labels[n]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function OptionButtons({ value, options = [], onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const active = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-3 text-sm font-semibold transitions ${active
                ? 'bg-customPurple border-customPurple text-white'
                : 'bg-main border-border text-white hover:border-customPurple'
              }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, optional = false }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-white">
      {children}
      {optional ? (
        <span className="font-normal text-text"> (optional)</span>
      ) : (
        <span className="text-red-400"> *</span>
      )}
    </label>
  );
}

function CloseFeedbackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close feedback form"
      title="Close"
      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-main/80 text-white transition hover:border-customPurple hover:bg-customPurple"
    >
      <IoClose className="text-xl" />
    </button>
  );
}

export default function PublicWebsiteFeedbackPageClient() {
  const router = useRouter();
  const pathname = usePathname() || '/feedback';

  const [form, setForm] = useState(makeEmptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const countryOptions = useMemo(() => getCountryOptions('en'), []);

  useEffect(() => {
    setFeedbackDomState(true);

    return () => {
      setFeedbackDomState(false);
    };
  }, []);

  const setField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const closeForSession = () => {
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
    } catch {
      // ignore
    }

    const storedReturnPath = getStoredFeedbackReturnPath();
    const referrerPath = getSameOriginReferrerPath();
    const returnPath = storedReturnPath || referrerPath;

    clearStoredFeedbackReturnPath();

    if (returnPath) {
      router.replace(returnPath);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  };

  const validate = () => {
    if (!form.overallExperience) {
      throw new Error('Please rate your overall experience');
    }

    if (!form.findingEase) {
      throw new Error('Please rate how easy it was to find content');
    }

    if (!form.loadingSpeed) {
      throw new Error('Please rate website loading speed');
    }

    if (!form.streamingQuality) {
      throw new Error('Please rate video/streaming quality');
    }

    if (!clean(form.country)) {
      throw new Error('Please select your country');
    }

    if (!form.visitFrequency) {
      throw new Error('Please select how frequently you visit');
    }

    if (form.recommendScore === '') {
      throw new Error('Please select your recommendation score');
    }

    if (!clean(form.oneImprovement)) {
      throw new Error('Please tell us the one thing we should improve first');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      validate();

      setSubmitting(true);

      await submitWebsiteFeedback({
        overallExperience: Number(form.overallExperience),
        findingEase: Number(form.findingEase),
        loadingSpeed: form.loadingSpeed,
        streamingQuality: form.streamingQuality,
        missingTitles: clean(form.missingTitles),
        missingFeatures: clean(form.missingFeatures),
        country: clean(form.country),
        visitFrequency: form.visitFrequency,
        recommendScore: Number(form.recommendScore),
        oneImprovement: clean(form.oneImprovement),

        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      });

      try {
        localStorage.setItem(LAST_SUBMITTED_AT_KEY, String(Date.now()));
        localStorage.removeItem(ACTIVE_MS_KEY);
        sessionStorage.removeItem(DISMISSED_SESSION_KEY);
        sessionStorage.removeItem(RETURN_PATH_SESSION_KEY);
      } catch {
        // ignore
      }

      setSubmitted(true);
      setForm(makeEmptyForm());

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      toast.success('Thank you! Your feedback helps us improve MovieFrost.');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-main border border-border rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

  if (submitted) {
    return (
      <>
        <style>{`
          html.mf-feedback-modal-open .mf-ad-slot,
          body.mf-feedback-modal-open .mf-ad-slot,
          html.mf-feedback-modal-open [data-mf-ad-slot="true"],
          body.mf-feedback-modal-open [data-mf-ad-slot="true"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}</style>

        <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
          <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-customPurple/70 bg-dry shadow-2xl">
            <CloseFeedbackButton onClick={closeForSession} />

            <div className="border-b border-border bg-dry px-4 py-4 pr-14 sm:px-6 sm:pr-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-customPurple">
                MovieFrost Feedback
              </p>

              <h1 className="mt-2 text-2xl font-bold text-white">
                Thank you for your feedback
              </h1>

              <p className="mt-2 text-sm leading-6 text-text">
                Your response has been submitted successfully. We will use it to
                improve MovieFrost speed, streaming quality, content discovery,
                and overall experience.
              </p>
            </div>

            <div className="px-4 py-6 sm:px-6">
              <button
                type="button"
                onClick={closeForSession}
                className="block w-full rounded-lg bg-customPurple px-4 py-3 text-center font-semibold text-white hover:bg-blue-600"
              >
                Back to MovieFrost
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .mf-feedback-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1B82FF #0B0F29;
        }

        .mf-feedback-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .mf-feedback-scrollbar::-webkit-scrollbar-track {
          background: #0B0F29;
          border-radius: 999px;
        }

        .mf-feedback-scrollbar::-webkit-scrollbar-thumb {
          background: #1B82FF;
          border-radius: 999px;
        }

        .mf-feedback-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4aa0ff;
        }

        html.mf-feedback-modal-open .mf-ad-slot,
        body.mf-feedback-modal-open .mf-ad-slot,
        html.mf-feedback-modal-open [data-mf-ad-slot="true"],
        body.mf-feedback-modal-open [data-mf-ad-slot="true"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>

      <div className="container mx-auto min-h-screen px-2 mobile:px-0 my-6 pb-24 sm:pb-8">
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-customPurple/70 bg-dry shadow-2xl md:max-w-2xl">
          <CloseFeedbackButton onClick={closeForSession} />

          <div className="border-b border-border bg-dry px-4 py-4 pr-14 sm:px-6 sm:pr-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-customPurple">
                MovieFrost Feedback
              </p>

              <h1 className="mt-2 text-2xl font-bold text-white">
                Help us improve MovieFrost
              </h1>

              <p className="mt-2 text-sm leading-6 text-text">
                Please fill this short form to improve the website. Your
                feedback directly helps us make MovieFrost faster, easier, and
                better for everyone.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mf-feedback-scrollbar px-4 py-5 pr-3 sm:px-6 sm:pr-4"
          >
            <div className="space-y-6">
              <div>
                <FieldLabel>
                  How would you rate your overall experience on our website?
                </FieldLabel>

                <ScaleButtons
                  value={form.overallExperience}
                  onChange={(value) => setField('overallExperience', value)}
                  labels={OVERALL_LABELS}
                />
              </div>

              <div>
                <FieldLabel>
                  How easy was it to find what you were looking for?
                </FieldLabel>

                <ScaleButtons
                  value={form.findingEase}
                  onChange={(value) => setField('findingEase', value)}
                  labels={{
                    1: 'Very hard',
                    2: 'Hard',
                    3: 'Okay',
                    4: 'Easy',
                    5: 'Very easy',
                  }}
                />
              </div>

              <div>
                <FieldLabel>
                  How would you rate the website&apos;s loading speed?
                </FieldLabel>

                <OptionButtons
                  value={form.loadingSpeed}
                  options={QUALITY_OPTIONS}
                  onChange={(value) => setField('loadingSpeed', value)}
                />
              </div>

              <div>
                <FieldLabel>How is the video/streaming quality?</FieldLabel>

                <OptionButtons
                  value={form.streamingQuality}
                  options={QUALITY_OPTIONS}
                  onChange={(value) => setField('streamingQuality', value)}
                />
              </div>

              <div>
                <FieldLabel optional>
                  Are there specific movies or shows you couldn&apos;t find?
                </FieldLabel>

                <textarea
                  value={form.missingTitles}
                  onChange={(e) => setField('missingTitles', e.target.value)}
                  className={`${inputClass} min-h-[110px]`}
                  placeholder="Example: movie/show names you searched for..."
                  maxLength={1000}
                />
              </div>

              <div>
                <FieldLabel optional>
                  What features are missing that you&apos;d love to have?
                </FieldLabel>

                <textarea
                  value={form.missingFeatures}
                  onChange={(e) => setField('missingFeatures', e.target.value)}
                  className={`${inputClass} min-h-[110px]`}
                  placeholder="Example: subtitles, watch history, better filters..."
                  maxLength={1000}
                />
              </div>

              <div>
                <FieldLabel>Which country are you visiting us from?</FieldLabel>

                <select
                  value={form.country}
                  onChange={(e) => setField('country', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select your country...</option>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>How frequently do you visit our website?</FieldLabel>

                <select
                  value={form.visitFrequency}
                  onChange={(e) => setField('visitFrequency', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select frequency...</option>
                  {VISIT_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>
                  How likely are you to recommend MovieFrost to a friend?
                </FieldLabel>

                <p className="mb-2 text-xs text-text">
                  0 = Not likely, 10 = Extremely likely
                </p>

                <ScaleButtons
                  value={form.recommendScore}
                  onChange={(value) => setField('recommendScore', value)}
                  min={0}
                  max={10}
                  compact
                />
              </div>

              <div>
                <FieldLabel>
                  What is the ONE thing we should improve first?
                </FieldLabel>

                <textarea
                  value={form.oneImprovement}
                  onChange={(e) => setField('oneImprovement', e.target.value)}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder="Tell us the highest priority improvement..."
                  maxLength={1000}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForSession}
                  className="flex-1 rounded-lg border border-border px-4 py-3 font-semibold text-white hover:bg-main"
                >
                  Maybe later
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-customPurple px-4 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>

              <p className="text-center text-xs leading-5 text-text">
                After submitting, we will not show this feedback request again
                for 2 months on this browser.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
