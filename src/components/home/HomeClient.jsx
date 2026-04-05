// src/components/home/HomeClient.jsx
'use client';

import React, {
  Suspense,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { SidebarContext } from '../../context/DrawerContext';
import { getUserInfo } from '../../lib/client/auth';

const HomeAdminPanelClient = lazy(() => import('./HomeAdminPanelClient'));

function DesktopTabs({ activeDesktopTab, setActiveDesktopTab }) {
  return (
    <div className="hidden sm:flex items-center gap-4 my-6 border-b border-border pb-4">
      {[
        { key: 'latestNew', label: 'Trending' },
        { key: 'latest', label: 'New Releases' },
        { key: 'browseBy', label: 'BrowseBy Film Industry' },
      ].map((t) => (
        <button
          key={t.key}
          onClick={() => setActiveDesktopTab(t.key)}
          className={`px-6 py-2.5 rounded-md font-semibold text-sm transitions ${activeDesktopTab === t.key
              ? 'bg-customPurple text-white'
              : 'bg-dry text-white hover:bg-customPurple/20 border border-border'
            }`}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function HomePublicShell({
  activeMobileTab,
  activeMobileHomeTab,
  setActiveMobileHomeTab,
  activeDesktopTab,
  setActiveDesktopTab,
  publicBannerNode,
  publicTrendingNode,
  publicLatestNode,
  publicBrowseNode,
}) {
  const showBanner = activeMobileTab !== 'browseBy';

  return (
    <div className="container mx-auto min-h-screen px-8 mobile:px-0 mb-6">
      {showBanner ? publicBannerNode : null}

      {/* MOBILE */}
      <div className="sm:hidden my-4 px-4">
        {activeMobileTab === 'browseBy' ? (
          publicBrowseNode
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveMobileHomeTab('latestNew')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border transitions ${activeMobileHomeTab === 'latestNew'
                    ? 'bg-customPurple text-white border-customPurple'
                    : 'bg-dry text-white border-border'
                  }`}
              >
                Trending
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileHomeTab('latestMovies')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border transitions ${activeMobileHomeTab === 'latestMovies'
                    ? 'bg-customPurple text-white border-customPurple'
                    : 'bg-dry text-white border-border'
                  }`}
              >
                New Releases
              </button>
            </div>

            {activeMobileHomeTab === 'latestNew'
              ? publicTrendingNode
              : publicLatestNode}
          </>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block">
        <DesktopTabs
          activeDesktopTab={activeDesktopTab}
          setActiveDesktopTab={setActiveDesktopTab}
        />

        {activeDesktopTab === 'latestNew' && publicTrendingNode}
        {activeDesktopTab === 'latest' && publicLatestNode}
        {activeDesktopTab === 'browseBy' && publicBrowseNode}
      </div>
    </div>
  );
}

export default function HomeClient({
  initialBanner = [],
  initialLatestNew = [],
  initialLatestMovies = [],
  initialTopRated = [],
  publicBannerNode = null,
  publicTrendingNode = null,
  publicLatestNode = null,
  publicBrowseNode = null,
}) {
  const { activeMobileTab, activeMobileHomeTab, setActiveMobileHomeTab } =
    useContext(SidebarContext);

  const [userInfo, setUserInfo] = useState(null);
  const isAdmin = !!userInfo?.isAdmin;

  const [activeDesktopTab, setActiveDesktopTab] = useState('latestNew');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('homeDesktopTab');
      if (stored) setActiveDesktopTab(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('homeDesktopTab', activeDesktopTab);
    } catch {
      // ignore
    }
  }, [activeDesktopTab]);

  useEffect(() => {
    setUserInfo(getUserInfo());

    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const publicShell = useMemo(
    () => (
      <HomePublicShell
        activeMobileTab={activeMobileTab}
        activeMobileHomeTab={activeMobileHomeTab}
        setActiveMobileHomeTab={setActiveMobileHomeTab}
        activeDesktopTab={activeDesktopTab}
        setActiveDesktopTab={setActiveDesktopTab}
        publicBannerNode={publicBannerNode}
        publicTrendingNode={publicTrendingNode}
        publicLatestNode={publicLatestNode}
        publicBrowseNode={publicBrowseNode}
      />
    ),
    [
      activeMobileTab,
      activeMobileHomeTab,
      setActiveMobileHomeTab,
      activeDesktopTab,
      publicBannerNode,
      publicTrendingNode,
      publicLatestNode,
      publicBrowseNode,
    ]
  );

  if (isAdmin) {
    return (
      <Suspense fallback={publicShell}>
        <HomeAdminPanelClient
          userInfo={userInfo}
          initialBanner={initialBanner}
          initialLatestNew={initialLatestNew}
          initialLatestMovies={initialLatestMovies}
          initialTopRated={initialTopRated}
        />
      </Suspense>
    );
  }

  return publicShell;
}
