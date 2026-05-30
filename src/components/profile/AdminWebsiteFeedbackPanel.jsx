// frontend-next/src/components/profile/AdminWebsiteFeedbackPanel.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Loader from '../common/Loader';
import { getWebsiteFeedbackAdmin } from '../../lib/client/websiteFeedback';

const SCALE_LABELS = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

const QUALITY_LABELS = ['Excellent', 'Good', 'Average', 'Poor'];

const FREQUENCY_LABELS = [
  'Daily',
  'Within three days',
  'Weekly',
  'Twice a month',
  'Monthly',
];

const formatDateTime = (value) => {
  if (!value) return '-';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function StatCard({ title, value, subtitle, tone = 'default' }) {
  const toneClass = {
    default: 'border-border bg-main',
    good: 'border-green-500/60 bg-green-500/10',
    warning: 'border-yellow-500/60 bg-yellow-500/10',
    danger: 'border-red-500/60 bg-red-500/10',
    primary: 'border-customPurple bg-customPurple/10',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneClass[tone] || toneClass.default}`}>
      <p className="text-xs uppercase tracking-wide text-dryGray">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtitle ? <p className="text-xs text-dryGray mt-1">{subtitle}</p> : null}
    </div>
  );
}

function DistributionBar({ label, count = 0, total = 0 }) {
  const percent = total > 0 ? Math.round((Number(count || 0) / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs mb-1">
        <span className="text-white">{label}</span>
        <span className="text-dryGray">
          {count} ({percent}%)
        </span>
      </div>

      <div className="h-2 rounded-full bg-dry overflow-hidden border border-border">
        <div
          className="h-full bg-customPurple rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CountSection({ title, counts = {}, labels = [], total = 0 }) {
  const rows = labels.length
    ? labels.map((label) => ({
      label: String(label),
      count: Number(counts?.[String(label)] || 0),
    }))
    : Object.entries(counts || {}).map(([label, count]) => ({
      label,
      count: Number(count || 0),
    }));

  return (
    <div className="bg-main border border-border rounded-xl p-4">
      <h3 className="text-white font-semibold text-sm">{title}</h3>

      <div className="space-y-3 mt-4">
        {rows.map((row) => (
          <DistributionBar
            key={row.label}
            label={row.label}
            count={row.count}
            total={total}
          />
        ))}
      </div>
    </div>
  );
}

function FeedbackCard({ item }) {
  if (!item) return null;

  const nps = Number(item?.recommendScore || 0);
  const npsTone =
    nps >= 9 ? 'text-green-400' : nps >= 7 ? 'text-yellow-300' : 'text-red-400';

  return (
    <article className="bg-main border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold">
            {item.country || 'Unknown country'}
          </p>
          <p className="text-xs text-dryGray mt-1">
            {formatDateTime(item.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-dry border border-border text-white">
            Experience: {item.overallExperience}/5
          </span>
          <span className="px-2 py-1 rounded bg-dry border border-border text-white">
            Find: {item.findingEase}/5
          </span>
          <span className={`px-2 py-1 rounded bg-dry border border-border ${npsTone}`}>
            NPS: {item.recommendScore}/10
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
        <div className="bg-dry border border-border rounded-lg p-3">
          <p className="text-dryGray text-xs">Loading speed</p>
          <p className="text-white mt-1">{item.loadingSpeed}</p>
        </div>

        <div className="bg-dry border border-border rounded-lg p-3">
          <p className="text-dryGray text-xs">Streaming quality</p>
          <p className="text-white mt-1">{item.streamingQuality}</p>
        </div>

        <div className="bg-dry border border-border rounded-lg p-3">
          <p className="text-dryGray text-xs">Visit frequency</p>
          <p className="text-white mt-1">{item.visitFrequency}</p>
        </div>

        <div className="bg-dry border border-border rounded-lg p-3">
          <p className="text-dryGray text-xs">Submitted from</p>
          <p className="text-white mt-1 break-all">{item.path || '-'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-dryGray text-xs">One thing to improve first</p>
          <p className="text-white text-sm leading-6 mt-1 whitespace-pre-line">
            {item.oneImprovement || '-'}
          </p>
        </div>

        {item.missingTitles ? (
          <div>
            <p className="text-dryGray text-xs">Movies/shows not found</p>
            <p className="text-text text-sm leading-6 mt-1 whitespace-pre-line">
              {item.missingTitles}
            </p>
          </div>
        ) : null}

        {item.missingFeatures ? (
          <div>
            <p className="text-dryGray text-xs">Requested features</p>
            <p className="text-text text-sm leading-6 mt-1 whitespace-pre-line">
              {item.missingFeatures}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminWebsiteFeedbackPanel({ token }) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const feedback = Array.isArray(data?.feedback) ? data.feedback : [];
  const summary = data?.summary || {};
  const total = Number(summary?.total || 0);

  const load = async (nextPage = page) => {
    if (!token) return;

    try {
      setLoading(true);

      const res = await getWebsiteFeedbackAdmin(token, {
        pageNumber: nextPage,
        limit: 10,
      });

      setData(res);
      setPage(Number(res?.page || nextPage));
    } catch (e) {
      toast.error(e?.message || 'Failed to load website feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const nps = summary?.nps || {};
  const npsScore = Number(nps?.score || 0);

  const npsTone = useMemo(() => {
    if (npsScore >= 50) return 'good';
    if (npsScore >= 0) return 'warning';
    return 'danger';
  }, [npsScore]);

  return (
    <section className="bg-dry border border-customPurple rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-customPurple text-xs uppercase tracking-wide font-semibold">
            Website Feedback Analytics
          </p>

          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Viewer Feedback Dashboard
          </h2>

          <p className="text-sm text-dryGray mt-2 max-w-3xl leading-6">
            These responses help you understand what viewers like, what slows
            them down, which countries are visiting, and what should be improved
            first to grow traffic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => load(page)}
          className="border border-customPurple text-customPurple hover:bg-customPurple hover:text-white transition px-4 py-2 rounded font-semibold text-sm"
        >
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <Loader />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
            <StatCard
              title="Total responses"
              value={total.toLocaleString()}
              subtitle="All submitted feedback"
              tone="primary"
            />

            <StatCard
              title="Avg experience"
              value={`${Number(summary.averageOverallExperience || 0).toFixed(1)}/5`}
              subtitle="Overall website rating"
              tone={Number(summary.averageOverallExperience || 0) >= 4 ? 'good' : 'warning'}
            />

            <StatCard
              title="Avg finding ease"
              value={`${Number(summary.averageFindingEase || 0).toFixed(1)}/5`}
              subtitle="How easily users find content"
              tone={Number(summary.averageFindingEase || 0) >= 4 ? 'good' : 'warning'}
            />

            <StatCard
              title="Avg recommendation"
              value={`${Number(summary.averageRecommendScore || 0).toFixed(1)}/10`}
              subtitle="Friend recommendation score"
              tone={Number(summary.averageRecommendScore || 0) >= 8 ? 'good' : 'warning'}
            />

            <StatCard
              title="NPS score"
              value={npsScore}
              subtitle={`${nps.promoters || 0} promoters • ${nps.detractors || 0} detractors`}
              tone={npsTone}
            />
          </div>

          {total > 0 ? (
            <div className="grid xl:grid-cols-2 gap-4 mt-6">
              <CountSection
                title="Overall Experience Distribution"
                counts={summary.overallExperienceCounts}
                labels={[1, 2, 3, 4, 5].map((n) => `${n}`)}
                total={total}
              />

              <CountSection
                title="Finding Ease Distribution"
                counts={summary.findingEaseCounts}
                labels={[1, 2, 3, 4, 5].map((n) => `${n}`)}
                total={total}
              />

              <CountSection
                title="Loading Speed"
                counts={summary.loadingSpeedCounts}
                labels={QUALITY_LABELS}
                total={total}
              />

              <CountSection
                title="Streaming Quality"
                counts={summary.streamingQualityCounts}
                labels={QUALITY_LABELS}
                total={total}
              />

              <CountSection
                title="Visit Frequency"
                counts={summary.visitFrequencyCounts}
                labels={FREQUENCY_LABELS}
                total={total}
              />

              <div className="bg-main border border-border rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm">Top Countries</h3>

                <div className="space-y-3 mt-4">
                  {(summary.topCountries || []).map((row) => (
                    <DistributionBar
                      key={row.country}
                      label={row.country}
                      count={row.count}
                      total={total}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-main border border-border rounded-xl p-6 mt-6">
              <h3 className="text-white font-semibold">
                No feedback submitted yet
              </h3>
              <p className="text-dryGray text-sm mt-2">
                After viewers spend 3 minutes on the website, they will see the
                feedback form. Submitted responses will appear here.
              </p>
            </div>
          )}

          {feedback.length ? (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-white font-semibold text-lg">
                  Latest Feedback
                </h3>

                <p className="text-sm text-dryGray">
                  Page {data?.page || 1} of {data?.pages || 1}
                </p>
              </div>

              <div className="space-y-4 mt-4">
                {feedback.map((item) => (
                  <FeedbackCard key={item._id} item={item} />
                ))}
              </div>

              {Number(data?.pages || 1) > 1 ? (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => load(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded border border-border text-white hover:bg-main transition disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-dryGray">
                    {page} / {data?.pages || 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => load(Math.min(Number(data?.pages || 1), page + 1))}
                    disabled={page >= Number(data?.pages || 1)}
                    className="px-4 py-2 rounded border border-border text-white hover:bg-main transition disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
