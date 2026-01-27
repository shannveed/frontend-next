'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { FiLogIn } from 'react-icons/fi';

import { apiFetch } from '../../lib/client/apiFetch';
import { getUserInfo, setUserInfo } from '../../lib/client/auth';

import { Input } from '../forms/Usedinputs';
import InlineError from '../forms/InlineError';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function redirectAfterAuth(router, user) {
  if (user?.isAdmin) {
    router.replace('/dashboard');
    return;
  }

  try {
    const raw = localStorage.getItem('redirectAfterLogin');
    if (raw) {
      const st = JSON.parse(raw);
      localStorage.removeItem('redirectAfterLogin');

      const fullPath = `${st?.pathname || '/profile'}${st?.search || ''}${
        st?.hash || ''
      }`;
      router.replace(fullPath);

      setTimeout(() => {
        if (typeof st?.scrollY === 'number' && st.scrollY > 0) {
          window.scrollTo(0, st.scrollY);
        }
      }, 150);

      return;
    }
  } catch {}

  router.replace('/profile');
}

export default function RegisterClient() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ui = getUserInfo();
    if (ui?.token) redirectAfterAuth(router, ui);
  }, [router]);

  const validate = () => {
    const errs = {};
    const name = fullName.trim();
    const em = email.trim();

    if (!name) errs.fullName = 'Full name is required';
    else if (name.length < 2) errs.fullName = 'Full name is too short';

    if (!em) errs.email = 'Email is required';
    else if (!isValidEmail(em)) errs.email = 'Please enter a valid email';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 6)
      errs.password = 'Password must be at least 6 characters';

    if (!confirm) errs.confirm = 'Confirm password is required';
    else if (confirm !== password) errs.confirm = 'Confirm password does not match';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canSubmit = useMemo(() => !loading, [loading]);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const data = await apiFetch('/api/users', {
        method: 'POST',
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          image: '',
        },
      });

      setUserInfo(data);
      toast.success(`Welcome ${data?.fullName || ''}`.trim());

      redirectAfterAuth(router, data);
    } catch (err) {
      toast.error(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 flex-colo min-h-[calc(100vh-200px)] py-2">
      <form
        onSubmit={submit}
        className="w-full 2xl:w-2/5 md:w-3/5 above-1000:w-[450px] above-1000:max-w-[450px] flex flex-col gap-2 above-1000:gap-2 pt-3 pb-4 px-3 sm:pt-5 sm:pb-6 sm:px-6 above-1000:pt-5 above-1000:pb-8 above-1000:px-8 bg-dry rounded-lg border border-border shadow-xl"
      >
        <img
          src="/images/MOVIEFROST.png"
          alt="logo"
          className="w-full h-12 above-1000:h-10 object-contain mb-1 above-1000:mb-1"
        />

        <h2 className="text-center text-xl above-1000:text-lg font-bold text-white text-opacity-90 mb-1 above-1000:mb-1">
          Create Your Free Account
        </h2>

        <div className="w-full flex flex-col gap-1">
          <Input
            label="Full Name"
            placeholder="Full Name"
            type="text"
            name="fullName"
            bg={true}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName)
                setFieldErrors((p) => ({ ...p, fullName: '' }));
            }}
            autoComplete="name"
          />
          {fieldErrors.fullName ? (
            <InlineError text={fieldErrors.fullName} />
          ) : null}
        </div>

        <div className="w-full flex flex-col gap-1">
          <Input
            label="Email"
            placeholder="Your Email"
            type="email"
            name="email"
            bg={true}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
            }}
            autoComplete="email"
          />
          {fieldErrors.email ? <InlineError text={fieldErrors.email} /> : null}
        </div>

        <div className="w-full flex flex-col gap-1">
          <Input
            label="Password"
            placeholder="******"
            type="password"
            name="password"
            bg={true}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password)
                setFieldErrors((p) => ({ ...p, password: '' }));
            }}
            autoComplete="new-password"
          />
          {fieldErrors.password ? (
            <InlineError text={fieldErrors.password} />
          ) : null}
        </div>

        <div className="w-full flex flex-col gap-1">
          <Input
            label="Confirm Password"
            placeholder="******"
            type="password"
            name="confirm"
            bg={true}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErrors.confirm)
                setFieldErrors((p) => ({ ...p, confirm: '' }));
            }}
            autoComplete="new-password"
          />
          {fieldErrors.confirm ? <InlineError text={fieldErrors.confirm} /> : null}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-customPurple transitions hover:bg-main flex-rows mt-6 mb-4 above-1000:mt-5 above-1000:mb-3 gap-4 text-white font-semibold p-4 above-1000:p-3 rounded-lg w-full disabled:opacity-60"
        >
          {loading ? (
            'Loading...'
          ) : (
            <>
              <FiLogIn /> Sign Up
            </>
          )}
        </button>

        <p className="text-center text-border text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-customPurple font-semibold ml-2 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
