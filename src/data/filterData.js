// frontend-next/src/data/filterData.js

export const LanguageData = [
  { title: 'Sort By Language' },
  { title: 'English' },
  { title: 'Korean' },
  { title: 'Hindi' },
  { title: 'Chinese' },
  { title: 'Japanese' },
  { title: 'Urdu' },
  { title: 'Turkish' },
  { title: 'Arabic' },
  { title: 'French' },
  { title: 'German' },
  { title: 'Spanish' },
  { title: 'Italian' },
  { title: 'Russian' },
  { title: 'Portuguese' },
  { title: 'Dutch' },
  { title: 'Swedish' },
  { title: 'Danish' },
  { title: 'Norwegian' },
  { title: 'Finnish' },
  { title: 'Indonesian' },
  { title: 'Malay' },
  { title: 'Thai' },
  { title: 'Vietnamese' },
  { title: 'Hebrew' },
  { title: 'Greek' },
  { title: 'Polish' },
  { title: 'Romanian' },
  { title: 'Swahili' },
];

export const RatesData = [
  { title: 'Sort By Rates' },
  { title: '1 Star' },
  { title: '2 Star' },
  { title: '3 Star' },
  { title: '4 Star' },
  { title: '5 Star' },
];

export const TimesData = [
  { title: 'Sort By Hours' },
  { title: '1 Hours' },
  { title: '2 Hours' },
  { title: '3 Hours' },
  { title: '4 Hours' },
  { title: '5 Hours' },
  { title: '6 Hours' },
  { title: '7 Hours' },
  { title: '8 Hours' },
  { title: '9 Hours' },
  { title: '10 Hours' },
];

export const YearData = [
  { title: 'Sort By Year' },
  { title: '2026' },
  { title: '2025' },
  { title: '2024' },
  { title: '2023' },
  { title: '2022' },
  { title: '2021' },
  { title: '2020' },
  { title: '2019' },
  { title: '2018' },
  { title: '2017' },
  { title: '2016' },
  { title: '2015' },
  { title: '2014' },
  { title: '2013' },
  { title: '2012' },
  { title: '2011' },
  { title: '2010' },
  { title: '2009' },
  { title: '2008' },
  { title: '2007' },
  { title: '2006' },
  { title: '2005' },
  { title: '2004' },
  { title: '2003' },
  { title: '2002' },
  { title: '2001' },
  { title: '2000' },
];

/**
 * ✅ NEW: Type-specific BrowseBy lists for /movies
 *
 * - `title`: what user sees in dropdown
 * - `value` (optional): what we actually send in ?browseBy=
 *
 * Why value is optional:
 * You asked Movie page should show "Chinese" (but your DB value is usually "Chinease Drama").
 * This lets you display "Chinese" while still filtering correctly without changing DB data.
 */

// ✅ /movies?type=Movie
export const browseByMovieData = [
  { title: 'Browse By' },
  { title: 'Hollywood (English)' },
  { title: 'Bollywood (Hindi)' },
  { title: 'Korean (English)' },
  { title: 'Indian Punjabi Movies' },
  { title: 'South Indian (Hindi Dubbed)' },
  { title: 'Japanese (Movies)' },

  // Display "Chinese" but filter using your existing DB value
  { title: 'Chinese', value: 'Chinease Drama' },
];

// ✅ /movies?type=WebSeries
export const browseByWebSeriesData = [
  { title: 'Browse By' },
  { title: 'Hollywood Web Series (English)' },
  { title: 'Chinease Drama' },
  { title: 'Korean Drama (Korean)' },
  { title: 'Hollywood Web Series (Hindi Dubbed)' },
  { title: 'Bollywood Web Series (Hindi)' },
  { title: 'Japanese Anime' },
  { title: 'Japanese Web Series' },
  { title: 'Japanese Web Series (Hindi)' },
  { title: 'Korean (Hindi Dubbed)' },
];

// Fallback when /movies has no type param
export const browseByData = [
  { title: 'Browse By' },

  // Movies
  { title: 'Hollywood (English)' },
  { title: 'Bollywood (Hindi)' },
  { title: 'Korean (English)' },
  { title: 'Korean (Hindi Dubbed)' },
  { title: 'Indian Punjabi Movies' },
  { title: 'South Indian (Hindi Dubbed)' },
  { title: 'Japanese (Movies)' },

  // WebSeries
  { title: 'Hollywood Web Series (English)' },
  { title: 'Hollywood Web Series (Hindi Dubbed)' },
  { title: 'Bollywood Web Series (Hindi)' },
  { title: 'Bollywood Web Series' },
  { title: 'Japanese Web Series' },
  { title: 'Japanese Web Series (Hindi)' },
  { title: 'Korean Drama (Korean)' },
  { title: 'Japanese Anime' },

  // Chinese (DB)
  { title: 'Chinease Drama' },
];
