'use client';

import React, { useEffect, useState } from 'react';
import Loader from '../common/Loader';
import { getUserInfo } from '../../lib/client/auth';

export default function RequireAuth({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const ui = getUserInfo();

    if (!ui?.token) {
      window.location.href = '/login'; // CRA fallback or your future Next /login
      return;
    }

    setUser(ui);
  }, []);

  if (!user) return <Loader />;

  return typeof children === 'function' ? children(user) : children;
}
