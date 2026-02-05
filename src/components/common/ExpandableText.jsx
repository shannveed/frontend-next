'use client';

import React, { useMemo, useState } from 'react';

const normalizeText = (value) => String(value ?? '').replace(/\r\n/g, '\n');

/**
 * Returns:
 * - full: trimmed full text
 * - short: first N words (preserving original characters up to that point)
 * - truncated: true if there are more than N words
 */
const getWordLimited = (value, wordLimit) => {
  const full = normalizeText(value).trim();
  if (!full) return { full: '', short: '', truncated: false };

  const limit = Number(wordLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return { full, short: full, truncated: false };
  }

  const re = /\S+/g; // "word" = any non-whitespace chunk
  let count = 0;
  let endIndex = 0;
  let match;

  while ((match = re.exec(full)) !== null) {
    count += 1;
    if (count === limit) {
      endIndex = re.lastIndex; // end of the Nth word
      break;
    }
  }

  // Less than limit words
  if (count < limit || endIndex <= 0) {
    return { full, short: full, truncated: false };
  }

  // If nothing meaningful remains after the Nth word, don't truncate
  const rest = full.slice(endIndex).trim();
  if (!rest) {
    return { full, short: full, truncated: false };
  }

  const short = full.slice(0, endIndex).trimEnd();
  return { full, short, truncated: true };
};

export default function ExpandableText({
  text = '',
  wordLimit = 300,

  // Styling
  textClassName = '',
  buttonClassName = '',
  wrapperClassName = '',

  // Labels
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  ellipsis = '…',

  initiallyExpanded = false,
}) {
  const [expanded, setExpanded] = useState(!!initiallyExpanded);

  const { full, short, truncated } = useMemo(
    () => getWordLimited(text, wordLimit),
    [text, wordLimit]
  );

  if (!full) return null;

  return (
    <div className={wrapperClassName}>
      <p className={textClassName}>
        {expanded || !truncated ? full : `${short}${ellipsis}`}
      </p>

      {truncated ? (
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className={buttonClassName}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
