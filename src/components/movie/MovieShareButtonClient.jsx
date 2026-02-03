// frontend-next/src/components/movie/MovieShareButtonClient.jsx
'use client';

import React, { useState } from 'react';
import ShareModalClient from './ShareModalClient';

export default function MovieShareButtonClient({
  movieName = '',
  buttonClassName = '',
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        aria-label="Share"
      >
        {children}
      </button>

      <ShareModalClient
        open={open}
        onClose={() => setOpen(false)}
        movie={{ name: movieName }}
      />
    </>
  );
}
