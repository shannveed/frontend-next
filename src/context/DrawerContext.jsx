'use client';

import React, { createContext, useCallback, useState } from 'react';

export const SidebarContext = createContext(null);

export default function DrawerContext({ children }) {
  const [mobileDrawer, setMobileDrawer] = useState(false);

  // Mobile tabs (Phase 2B will use these fully)
  const [activeMobileTab, setActiveMobileTab] = useState('home');
  const [activeMobileHomeTab, setActiveMobileHomeTab] = useState('latestNew');

  const toggleDrawer = useCallback(() => {
    setMobileDrawer((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => setMobileDrawer(false), []);

  return (
    <SidebarContext.Provider
      value={{
        mobileDrawer,
        toggleDrawer,
        closeDrawer,
        activeMobileTab,
        setActiveMobileTab,
        activeMobileHomeTab,
        setActiveMobileHomeTab,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
