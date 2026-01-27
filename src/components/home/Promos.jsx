'use client';

import React from 'react';

export default function Promos() {
  return (
    <div className="bg-dry border border-border rounded-lg p-6 my-8">
      <h3 className="text-xl font-bold mb-2">Download Movies & Watch Offline</h3>
      <p className="text-text text-sm leading-7">
        Discover the ultimate convenience of downloading your favorite movies and watching them offline.
        Enjoy seamless entertainment anywhere on mobile.
      </p>

      <div className="mt-4 flex gap-3 text-xs">
        <span className="px-2 py-1 rounded bg-customPurple text-white font-semibold">HD 4K</span>
        <span className="px-2 py-1 rounded bg-customPurple text-white font-semibold">2K</span>
      </div>
    </div>
  );
}
