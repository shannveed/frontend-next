// frontend-next/src/components/modals/WebsiteFeedbackPrompt.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';
import { FaStar } from 'react-icons/fa';

import { getUserInfo } from '../../lib/client/auth';
import { submitWebsiteFeedback } from '../../lib/client/websiteFeedback';
import { getCountryOptions } from '../../data/countries';
import { FEEDBACK_MODAL_OPEN_CHANGE } from '../../lib/events';

const ACTIVE_TIME_TARGET_MS = 3 * 60 * 1000; // 3 minutes
const SUBMIT_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

const ACTIVE_MS_KEY = 'mf_feedback_active_ms_v1';
const LAST_SUBMITTED_AT_KEY = 'mf_feedback_last_submitted_at_v1';
const DISMISSED_SESSION_KEY = 'mf_feedback_dismissed_this_session_v1';

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

const EXCLUDED_EXACT = ['/login', '/register', '/signup'];

const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/viewer-feedback',
  '/movieslist',
  '/addmovie',
  '/edit',
  '/bulk-create',
  '/get-movies',
  '/update-movies',
  '/push-notification',
  '/categories',
  '/users',
  '/blog-posts',
  '/blog-preview',
  '/get-blog-posts',
  '/bulk-create-blog-posts',
  '/update-blog-posts',
];

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

const shouldSkipPath = (pathname = '') => {
  const path = String(pathname || '/');

  if (EXCLUDED_EXACT.includes(path)) return true;

  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const readNumber = (key, fallback = 0) => {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

const writeNumber = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const isRecentlySubmitted = () => {
  try {
    const ts = Number(localStorage.getItem(LAST_SUBMITTED_AT_KEY) || 0);
    if (!ts) return false;

    return Date.now() - ts < SUBMIT_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const isDismissedThisSession = () => {
  try {
    return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * ✅ Central DOM/global state for feedback modal.
 * Ads listen to this event/body class and unmount while feedback is open.
 */
const setFeedbackModalDomState = (open) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const nextOpen = !!open;

  try {
    document.documentElement.classList.toggle(
      'mf-feedback-modal-open',
      nextOpen
    );
    document.body.classList.toggle('mf-feedback-modal-open', nextOpen);

    if (nextOpen) {
      document.documentElement.setAttribute(
        'data-mf-feedback-modal-open',
        'true'
      );
    } else {
      document.documentElement.removeAttribute('data-mf-feedback-modal-open');
    }

    window.dispatchEvent(
      new CustomEvent(FEEDBACK_MODAL_OPEN_CHANGE, {
        detail: { open: nextOpen },
      })
    );
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

export default function WebsiteFeedbackPrompt({
  blocked = false,
  onOpenChange,
}) {
  const pathname = usePathname() || '/';

  const [mounted, setMounted] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());

  const countryOptions = useMemo(() => getCountryOptions('en'), []);

  const setField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  useEffect(() => {
    setMounted(true);

    return () => {
      setFeedbackModalDomState(false);
    };
  }, []);

  // Notify parent + lock page scroll while modal is open.
  useEffect(() => {
    onOpenChange?.(!!open);
    setFeedbackModalDomState(!!open);

    if (!open || typeof document === 'undefined') {
      return () => {
        onOpenChange?.(false);
        setFeedbackModalDomState(false);
      };
    }

    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      onOpenChange?.(false);
      setFeedbackModalDomState(false);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!mounted) return;

    const ui = getUserInfo();

    if (ui?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;
    if (isRecentlySubmitted()) return;
    if (isDismissedThisSession()) return;

    let lastTick = Date.now();

    const tick = () => {
      if (document.visibilityState !== 'visible') {
        lastTick = Date.now();
        return;
      }

      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        lastTick = Date.now();
        return;
      }

      const now = Date.now();
      const delta = Math.max(0, now - lastTick);
      lastTick = now;

      const next = readNumber(ACTIVE_MS_KEY, 0) + delta;
      writeNumber(ACTIVE_MS_KEY, next);

      if (next >= ACTIVE_TIME_TARGET_MS) {
        setEligible(true);
      }
    };

    tick();

    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted) return;
    if (!eligible) return;
    if (blocked) return;
    if (open) return;

    const ui = getUserInfo();

    if (ui?.isAdmin) return;
    if (shouldSkipPath(pathname)) return;
    if (isRecentlySubmitted()) return;
    if (isDismissedThisSession()) return;

    // ✅ Set global state immediately before the modal appears.
    setFeedbackModalDomState(true);
    setOpen(true);
  }, [mounted, eligible, blocked, open, pathname]);

  const closeForSession = () => {
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
    } catch {
      // ignore
    }

    setFeedbackModalDomState(false);
    setOpen(false);
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
      } catch {
        // ignore
      }

      toast.success('Thank you! Your feedback helps us improve MovieFrost.');

      setFeedbackModalDomState(false);
      setOpen(false);
      setForm(makeEmptyForm());
    } catch (err) {
      toast.error(err?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  const inputClass =
    'w-full bg-main border border-border rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

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
      `}</style>

      <div
        data-mf-feedback-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3 sm:p-6"
        onClick={closeForSession}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-customPurple/70 bg-dry shadow-2xl md:max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border bg-dry px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={closeForSession}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-main text-white hover:bg-customPurple"
              aria-label="Close feedback form"
            >
              <IoClose size={20} />
            </button>

            <div className="pr-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-customPurple">
                MovieFrost Feedback
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Help us improve MovieFrost
              </h2>

              <p className="mt-2 text-sm leading-6 text-text">
                Please fill this short form to improve the website. Your
                feedback directly helps us make MovieFrost faster, easier, and
                better for everyone.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mf-feedback-scrollbar max-h-[min(74vh,760px)] overflow-y-auto px-4 py-5 pr-3 sm:px-6 sm:pr-4"
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
                After submitting, we will not show this form again for 2 months
                on this browser.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
