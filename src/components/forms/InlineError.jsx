'use client';

import React from 'react';

export default function InlineError({ text }) {
  if (!text) return null;

  return <p className="text-subMain text-xs mt-2">{text}</p>;
}
