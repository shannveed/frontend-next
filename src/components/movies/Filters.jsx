'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaAngleDown, FaCheck } from 'react-icons/fa';

import {
  LanguageData,
  RatesData,
  TimesData,
  YearData,
  browseByData,
} from '../../data/filterData';

const digitsOnly = (value = '') => String(value || '').replace(/\D/g, '');

const findByTitle = (items, title, fallback) => {
  const t = String(title || '');
  return items.find((i) => i?.title === t) || fallback;
};

const findByDigits = (items, digits, fallback) => {
  const d = String(digits || '');
  if (!d) return fallback;
  return items.find((i) => digitsOnly(i?.title) === d) || fallback;
};

function Dropdown({ selected, items, onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 bg-dry border border-border rounded px-4 py-3 above-1000:py-2.5 mobile:py-2 text-white text-xs above-1000:text-xs"
      >
        <span className="truncate">{selected?.title || ''}</span>
        <FaAngleDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-dry border border-border rounded shadow-lg overflow-hidden z-50 max-h-72 overflow-y-auto">
          {items.map((item, i) => {
            const active = item?.title === selected?.title;

            return (
              <button
                type="button"
                key={`${item?.title || 'item'}-${i}`}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className={`w-full text-left text-xs py-2 above-1000:py-1.5 mobile:py-1.5 pl-10 above-1000:pl-8 mobile:pl-6 pr-4 above-1000:pr-3 mobile:pr-2 relative transition
                  ${
                    active
                      ? 'font-semibold bg-customPurple text-white'
                      : 'font-normal hover:bg-main/70 text-white'
                  }`}
              >
                {item?.title}
                {active && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <FaCheck className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const toStr = (v) => (v === undefined || v === null ? '' : String(v));

export default function MoviesFilters({
  categories = [],
  browseByDistinct = [],
  query = {},
}) {
  const router = useRouter();

  // Category items
  const categoryItems = useMemo(() => {
    const cats = Array.isArray(categories) ? categories : [];
    if (!cats.length) return [{ title: 'No category found' }];
    return [{ title: 'All Categories' }, ...cats.map((c) => ({ title: c.title }))];
  }, [categories]);

  // BrowseBy items
  const browseItems = useMemo(() => {
    const distinct = Array.isArray(browseByDistinct) ? browseByDistinct : [];
    const staticTitles = Array.isArray(browseByData)
      ? browseByData.map((b) => b.title).filter(Boolean)
      : ['Browse By'];

    const seen = new Set(staticTitles.map((s) => String(s).toLowerCase()));
    const extras = distinct
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .filter((s) => !seen.has(s.toLowerCase()));

    const titles = [...staticTitles, ...extras];

    const placeholder = 'Browse By';
    const without = titles.filter((t) => t !== placeholder);
    return [{ title: placeholder }, ...without.map((t) => ({ title: t }))];
  }, [browseByDistinct]);

  // Selected states
  const [category, setCategory] = useState(categoryItems[0] || { title: 'All Categories' });
  const [browseBy, setBrowseBy] = useState(browseItems[0] || { title: 'Browse By' });
  const [language, setLanguage] = useState(LanguageData[0]);
  const [year, setYear] = useState(YearData[0]);
  const [times, setTimes] = useState(TimesData[0]);
  const [rates, setRates] = useState(RatesData[0]);

  // Sync UI from server query (works with back/forward + SSR navigations)
  const queryKey = useMemo(() => JSON.stringify(query || {}), [query]);

  useEffect(() => {
    const qCategory = toStr(query?.category);
    const qBrowse = toStr(query?.browseBy);
    const qLanguage = toStr(query?.language);
    const qYear = toStr(query?.year);
    const qTime = toStr(query?.time);
    const qRate = toStr(query?.rate);

    setCategory(qCategory ? findByTitle(categoryItems, qCategory, categoryItems[0]) : categoryItems[0]);
    setBrowseBy(qBrowse ? findByTitle(browseItems, qBrowse, browseItems[0]) : browseItems[0]);
    setLanguage(qLanguage ? findByTitle(LanguageData, qLanguage, LanguageData[0]) : LanguageData[0]);
    setYear(findByDigits(YearData, qYear, YearData[0]));
    setTimes(findByDigits(TimesData, qTime, TimesData[0]));
    setRates(findByDigits(RatesData, qRate, RatesData[0]));
  }, [queryKey, categoryItems, browseItems]);

  const buildBaseParams = useCallback(() => {
    const params = new URLSearchParams();

    const set = (k, v) => {
      const val = toStr(v).trim();
      if (!val) return;
      params.set(k, val);
    };

    set('category', query?.category);
    set('browseBy', query?.browseBy);
    set('language', query?.language);
    set('year', query?.year);
    set('time', query?.time);
    set('rate', query?.rate);
    set('search', query?.search);

    const pn = Number(query?.pageNumber) || 1;
    if (pn > 1) params.set('pageNumber', String(pn));

    return params;
  }, [query]);

  const pushParams = useCallback(
    (mutate) => {
      const params = buildBaseParams();

      // reset pagination on filter change
      params.delete('pageNumber');

      mutate(params);

      const qs = params.toString();
      router.push(qs ? `/movies?${qs}` : '/movies');
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    },
    [router, buildBaseParams]
  );

  // Handlers
  const selectBrowseBy = (item) => {
    setBrowseBy(item);
    pushParams((params) => {
      const t = String(item?.title || '');
      if (!t || t === 'Browse By') params.delete('browseBy');
      else params.set('browseBy', t);
    });
  };

  const selectCategory = (item) => {
    setCategory(item);
    pushParams((params) => {
      const t = String(item?.title || '');
      if (!t || t === 'All Categories' || t === 'No category found') params.delete('category');
      else params.set('category', t);
    });
  };

  const selectLanguage = (item) => {
    setLanguage(item);
    pushParams((params) => {
      const t = String(item?.title || '');
      if (!t || t === 'Sort By Language') params.delete('language');
      else params.set('language', t);
    });
  };

  const selectYear = (item) => {
    setYear(item);
    pushParams((params) => {
      const v = digitsOnly(item?.title);
      if (!v) params.delete('year');
      else params.set('year', v);
    });
  };

  const selectTimes = (item) => {
    setTimes(item);
    pushParams((params) => {
      const v = digitsOnly(item?.title);
      if (!v) params.delete('time');
      else params.set('time', v);
    });
  };

  const selectRates = (item) => {
    setRates(item);
    pushParams((params) => {
      const v = digitsOnly(item?.title);
      if (!v) params.delete('rate');
      else params.set('rate', v);
    });
  };

  const filters = [
    { key: 'browseBy', selected: browseBy, items: browseItems, onSelect: selectBrowseBy },
    { key: 'category', selected: category, items: categoryItems, onSelect: selectCategory },
    { key: 'language', selected: language, items: LanguageData, onSelect: selectLanguage },
    { key: 'year', selected: year, items: YearData, onSelect: selectYear },
    { key: 'time', selected: times, items: TimesData, onSelect: selectTimes },
    { key: 'rate', selected: rates, items: RatesData, onSelect: selectRates },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 above-1000:grid-cols-6 gap-3">
      {filters.map((f) => (
        <Dropdown key={f.key} selected={f.selected} items={f.items} onSelect={f.onSelect} />
      ))}
    </div>
  );
}
