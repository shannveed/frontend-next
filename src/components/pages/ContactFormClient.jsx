// src/components/pages/ContactFormClient.jsx
'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

const SUPPORT_EMAIL = 'support@moviefrost.com';

export default function ContactFormClient() {
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const buildMailto = () => {
    const safeSubject = subject.trim() || 'MovieFrost Support';
    const body = [
      `Name: ${name.trim() || '-'}`,
      `Email: ${fromEmail.trim() || '-'}`,
      '',
      message.trim(),
    ].join('\n');

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      safeSubject
    )}&body=${encodeURIComponent(body)}`;
  };

  const submit = (e) => {
    e.preventDefault();

    if (message.trim().length < 10) {
      toast.error('Please write a message (at least 10 characters).');
      return;
    }

    toast.success('Opening your email app...');
    window.location.href = buildMailto();
  };

  const inputClass =
    'w-full bg-main border border-border rounded px-3 py-3 text-sm text-white outline-none focus:border-customPurple';

  return (
    <div className="bg-main border border-border rounded-lg p-5">
      <h2 className="text-white font-semibold text-lg">Send us a message</h2>
      <p className="text-dryGray text-sm mt-1">
        This will open your email app and send to{' '}
        <span className="text-white">{SUPPORT_EMAIL}</span>.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
        />

        <input
          className={inputClass}
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="Your email (optional)"
          type="email"
        />

        <input
          className={inputClass}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
        />

        <textarea
          className={`${inputClass} min-h-[140px]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message..."
        />

        <button
          type="submit"
          className="w-full bg-customPurple hover:bg-opacity-90 transition text-white py-3 rounded font-semibold"
        >
          Send
        </button>
      </form>
    </div>
  );
}
