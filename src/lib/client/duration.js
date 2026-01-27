export function parseDurationToMinutes(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;

  // numeric-only: treat as minutes
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // Supports: 2Hr 35Min, 2 hr, 35 min, 2h 35m, etc
  const re =
    /(?:(\d+)\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?/i;

  const m = s.match(re);
  if (!m) return null;

  const hrs = m[1] ? Number(m[1]) : 0;
  const mins = m[2] ? Number(m[2]) : 0;

  if (!Number.isFinite(hrs) || !Number.isFinite(mins)) return null;
  if (hrs <= 0 && mins <= 0) return null;

  return hrs * 60 + mins;
}

export function formatMinutesToDuration(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';

  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}Hr`);
  if (mins > 0) parts.push(`${mins}Min`);

  return parts.join(' ');
}
