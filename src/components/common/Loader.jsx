// src/components/common/Loader.jsx
'use client';

import React from 'react';

export default function Loader({ className = '', size = 48 }) {
  return (
    <div className={`w-full flex items-center justify-center py-12 ${className}`}>
      <div
        className="animate-spin rounded-full border-4 border-customPurple border-t-transparent"
        style={{ width: size, height: size }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
