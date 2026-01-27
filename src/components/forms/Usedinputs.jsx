'use client';

import React from 'react';

export function Input({
  label,
  placeholder = '',
  type = 'text',
  bg = true,

  // Optional: react-hook-form style register object (CRA-like)
  register,

  // Optional: controlled input style
  value,
  onChange,

  name,
  id,
  autoComplete,
}) {
  const inputId = id || name;

  const inputClass = `w-full ${
    bg ? 'bg-main' : 'bg-transparent'
  } border border-border rounded px-2 py-3 text-sm text-white outline-none focus:border-customPurple`;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-border font-semibold text-sm"
        >
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} mt-2`}
        // Support both RHF and controlled usage:
        {...(register ? register : {})}
        {...(!register
          ? {
              value: value ?? '',
              onChange,
            }
          : {})}
      />
    </div>
  );
}
