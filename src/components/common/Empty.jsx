// src/components/common/Empty.jsx
'use client';

import React from 'react';
import { RiMovie2Line } from 'react-icons/ri';

export default function Empty({ message = "It seems like we don't have any items." }) {
  return (
    <div className="w-full gap-6 flex-colo py-12">
      <div className="flex-colo w-24 h-24 p-5 mb-4 rounded-full bg-main text-customPurple text-4xl">
        <RiMovie2Line />
      </div>
      <p className="text-border text-sm text-center">{message}</p>
    </div>
  );
}
