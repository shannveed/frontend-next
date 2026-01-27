'use client';

import React, { useMemo, useState } from 'react';
import { LanguageData, RatesData, TimesData, YearData } from '../../data/filterData';

export default function FiltersBar({
  categories = [],
  browseByDistinct = [],
  initialQuery,
  onApply,
  onClear,
}) {
  const initial = initialQuery || {};

  const browseByOptions = useMemo(() => {
    const distinct = Array.isArray(browseByDistinct) ? browseByDistinct.filter(Boolean) : [];
    const predefined = [
      'Hollywood (English)',
      'Hollywood (Hindi Dubbed)',
      'Bollywood',
      'South Indian (Hindi Dubbed)',
      'Korean (English)',
      'Korean (Hindi Dubbed)',
      'Chinease Drama',
      'Japanese Anime',
      'Indian Punjabi Movies',
      'Hollywood Web Series (English)',
      'Hollywood Web Series (Hindi Dubbed)',
      'Bollywood Web Series',
    ];
    return Array.from(new Set([...distinct, ...predefined]));
  }, [browseByDistinct]);

  const [category, setCategory] = useState(initial.category || '');
  const [browseBy, setBrowseBy] = useState(initial.browseBy || '');
  const [language, setLanguage] = useState(initial.language || '');
  const [year, setYear] = useState(initial.year || '');
  const [time, setTime] = useState(initial.time || '');
  const [rate, setRate] = useState(initial.rate || '');
  const [search, setSearch] = useState(initial.search || '');

  const apply = () => {
    onApply?.({
      category,
      browseBy,
      language,
      year,
      time,
      rate,
      search,
    });
  };

  const fieldClass =
    'w-full bg-main border border-border rounded px-3 py-3 text-white text-sm outline-none focus:border-customPurple';

  return (
    <div className="bg-dry border border-border rounded-lg p-4 mobile:px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className={fieldClass}
        />

        <select value={browseBy} onChange={(e) => setBrowseBy(e.target.value)} className={fieldClass}>
          <option value="">Browse By</option>
          {browseByOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.title}>{c.title}</option>
          ))}
        </select>

        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldClass}>
          {LanguageData.map((l) => (
            <option key={l} value={l === 'Sort By Language' ? '' : l}>{l}</option>
          ))}
        </select>

        <select value={year} onChange={(e) => setYear(e.target.value)} className={fieldClass}>
          {YearData.map((y) => (
            <option key={y} value={y === 'Sort By Year' ? '' : y}>{y}</option>
          ))}
        </select>

        <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
          {TimesData.map((t) => (
            <option key={t} value={t === 'Sort By Hours' ? '' : t.replace(/\D/g, '')}>{t}</option>
          ))}
        </select>

        <select value={rate} onChange={(e) => setRate(e.target.value)} className={fieldClass}>
          {RatesData.map((r) => (
            <option key={r} value={r === 'Sort By Rates' ? '' : r.replace(/\D/g, '')}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          type="button"
          onClick={apply}
          className="bg-customPurple hover:bg-opacity-90 transitions text-white px-6 py-2 rounded font-semibold"
        >
          Apply
        </button>

        <button
          type="button"
          onClick={onClear}
          className="border border-border hover:bg-main transitions text-white px-6 py-2 rounded font-semibold"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
