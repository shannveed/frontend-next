// frontend-next/src/lib/client/nameInputParser.js

const normalizeSpaces = (value = '') =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200D\u202F\u205F\u2060\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniqClean = (arr) => {
  const out = [];
  const seen = new Set();

  for (const raw of arr || []) {
    const value = normalizeSpaces(raw);
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(value);
  }

  return out;
};

/**
 * Important:
 * Do NOT split plain text by comma because many movie names contain commas.
 *
 * Recommended input:
 *   Movie Name 1
 *   Movie Name 2
 *
 * JSON input is also supported:
 *   ["Movie 1", "Movie 2"]
 *   [{ "name": "Movie 1" }, { "name": "Movie 2" }]
 *   { "names": [...] }
 *   { "movies": [{ "name": "..." }] }
 *   { "items": [{ "name": "..." }] }
 *   { "text": "Movie 1\nMovie 2" }
 */
export const parseNamesFromInput = (raw = '') => {
  const text = String(raw || '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      if (parsed.every((x) => typeof x === 'string')) {
        return uniqClean(parsed);
      }

      if (parsed.every((x) => x && typeof x === 'object')) {
        return uniqClean(parsed.map((x) => x?.name));
      }
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.names)) return uniqClean(parsed.names);
      if (Array.isArray(parsed.movies)) {
        return uniqClean(parsed.movies.map((m) => m?.name));
      }
      if (Array.isArray(parsed.items)) {
        return uniqClean(parsed.items.map((m) => m?.name));
      }
      if (typeof parsed.text === 'string') {
        return parseNamesFromInput(parsed.text);
      }
    }
  } catch {
    // Fallback to plain text below.
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  // Support semicolon/pipe separated single-line lists.
  // Commas are intentionally NOT separators because movie names can contain commas.
  if (lines.length === 1) {
    const line = lines[0];

    if (line.includes(';')) {
      return uniqClean(line.split(';'));
    }

    if (line.includes('|')) {
      return uniqClean(line.split('|'));
    }
  }

  return uniqClean(lines);
};

export default parseNamesFromInput;
