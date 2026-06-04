// frontend-next/src/components/home/HomeClient.jsx
'use client';

import React, {
  Suspense,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SidebarContext } from '../../context/DrawerContext';
import { getUserInfo } from '../../lib/client/auth';

const HomeAdminPanelClient = lazy(() => import('./HomeAdminPanelClient'));

const BROWSE_BY_FILM_INDUSTRY_PATH = '/browse-by-film-industry';

function DesktopTabs({ activeDesktopTab, setActiveDesktopTab }) {
  const buttonBase =
    'px-6 py-2.5 rounded-md font-semibold text-sm transitions';

  return (
    <div className="hidden sm:flex items-center gap-4 my-6 border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setActiveDesktopTab('latestNew')}
        className={`${buttonBase} ${activeDesktopTab === 'latestNew'
            ? 'bg-customPurple text-white'
            : 'bg-dry text-white hover:bg-customPurple/20 border border-border'
          }`}
      >
        Trending
      </button>

      <button
        type="button"
        onClick={() => setActiveDesktopTab('latest')}
        className={`${buttonBase} ${activeDesktopTab === 'latest'
            ? 'bg-customPurple text-white'
            : 'bg-dry text-white hover:bg-customPurple/20 border border-border'
          }`}
      >
        New Releases
      </button>

      <Link
        href={BROWSE_BY_FILM_INDUSTRY_PATH}
        className={`${buttonBase} bg-dry text-white hover:bg-customPurple/20 border border-border`}
      >
        BrowseBy Film Industry
      </Link>
    </div>
  );
}

function HomePublicShell({
  activeMobileHomeTab,
  setActiveMobileHomeTab,
  activeDesktopTab,
  setActiveDesktopTab,
  publicBannerNode,
  publicTrendingNode,
  publicLatestNode,
}) {
  return (
    <div className="container mx-auto min-h-screen px-8 mobile:px-0 mb-6">
      {publicBannerNode}

      {/* MOBILE */}
      <div className="sm:hidden my-4 px-4">
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
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block">
        <DesktopTabs
          activeDesktopTab={activeDesktopTab}
          setActiveDesktopTab={setActiveDesktopTab}
        />

        {activeDesktopTab === 'latestNew' && publicTrendingNode}
        {activeDesktopTab === 'latest' && publicLatestNode}
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
}) {
  const router = useRouter();

  const {
    activeMobileTab,
    setActiveMobileTab,
    activeMobileHomeTab,
    setActiveMobileHomeTab,
  } = useContext(SidebarContext);

  const [userInfo, setUserInfo] = useState(null);
  const isAdmin = !!userInfo?.isAdmin;

  const [activeDesktopTab, setActiveDesktopTab] = useState('latestNew');

  /**
   * Mobile footer still exposes a BrowseBy button.
   * This bridge converts that old home-tab action into a real page navigation.
   */
  useEffect(() => {
    if (activeMobileTab !== 'browseBy') return;

    setActiveMobileTab?.('home');
    router.push(BROWSE_BY_FILM_INDUSTRY_PATH);
  }, [activeMobileTab, router, setActiveMobileTab]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('homeDesktopTab');

      if (stored === 'latestNew' || stored === 'latest') {
        setActiveDesktopTab(stored);
      } else {
        sessionStorage.setItem('homeDesktopTab', 'latestNew');
        setActiveDesktopTab('latestNew');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (activeDesktopTab === 'latestNew' || activeDesktopTab === 'latest') {
        sessionStorage.setItem('homeDesktopTab', activeDesktopTab);
      }
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
        activeMobileHomeTab={activeMobileHomeTab}
        setActiveMobileHomeTab={setActiveMobileHomeTab}
        activeDesktopTab={activeDesktopTab}
        setActiveDesktopTab={setActiveDesktopTab}
        publicBannerNode={publicBannerNode}
        publicTrendingNode={publicTrendingNode}
        publicLatestNode={publicLatestNode}
      />
    ),
    [
      activeMobileHomeTab,
      setActiveMobileHomeTab,
      activeDesktopTab,
      publicBannerNode,
      publicTrendingNode,
      publicLatestNode,
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
