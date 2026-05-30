// frontend-next/src/components/dashboard/SideBarShell.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

import { BsFillGridFill } from 'react-icons/bs';
import {
  FaListAlt,
  FaUsers,
  FaHeart,
  FaBell,
  FaCloudUploadAlt,
  FaSearch,
  FaEdit,
  FaRegNewspaper,
  FaComments,
} from 'react-icons/fa';
import {
  RiMovie2Fill,
  RiLockPasswordLine,
  RiLogoutCircleLine,
} from 'react-icons/ri';
import { HiViewGridAdd } from 'react-icons/hi';
import { FiSettings } from 'react-icons/fi';

import { getUserInfo } from '../../lib/client/auth';
import { EffectiveGateSquareAd } from '../ads/EffectiveGateNativeBanner';

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const isNextRoute = (href = '') =>
  href === '/' ||
  href === '/movies' ||
  href === '/favorites' ||
  href === '/profile' ||
  href === '/about-us' ||
  href === '/contact-us' ||
  href === '/dashboard' ||
  href === '/viewer-feedback' ||
  href === '/movieslist' ||
  href === '/addmovie' ||
  href === '/bulk-create' ||
  href === '/get-movies' ||
  href === '/update-movies' ||
  href === '/push-notification' ||
  href === '/categories' ||
  href === '/users' ||
  href === '/blog-posts' ||
  href === '/blog-posts/create' ||
  href === '/get-blog-posts' ||
  href === '/bulk-create-blog-posts' ||
  href === '/update-blog-posts' ||
  href.startsWith('/movies') ||
  href.startsWith('/movie/') ||
  href.startsWith('/watch/') ||
  href.startsWith('/edit/') ||
  href.startsWith('/blog-posts');

function SmartLink({ href, className, children }) {
  if (isNextRoute(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export default function SideBarShell({
  children,
  showSidebarAd = false,
  sidebarAdKey = '',
}) {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    setUserInfo(getUserInfo());

    const onStorage = () => setUserInfo(getUserInfo());
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isAdmin = !!userInfo?.isAdmin;

  const links = useMemo(() => {
    if (!userInfo) return [];

    if (isAdmin) {
      return [
        { name: 'Dashboard', link: '/dashboard', icon: BsFillGridFill },
        { name: 'Movies List', link: '/movieslist', icon: FaListAlt },
        {
          name: 'Viewer Feedback',
          link: '/viewer-feedback',
          icon: FaComments,
        },
        { name: 'Add Movie', link: '/addmovie', icon: RiMovie2Fill },

        { name: 'Bulk Create', link: '/bulk-create', icon: FaCloudUploadAlt },
        { name: 'Get Movies', link: '/get-movies', icon: FaSearch },
        { name: 'Update Movies', link: '/update-movies', icon: FaEdit },

        { name: 'Blog Posts', link: '/blog-posts', icon: FaRegNewspaper },
        { name: 'Create Blog Post', link: '/blog-posts/create', icon: FaEdit },
        { name: 'Get Blog Posts', link: '/get-blog-posts', icon: FaSearch },
        { name: 'Update Blog Posts', link: '/update-blog-posts', icon: FaEdit },
        {
          name: 'Bulk Create Blog',
          link: '/bulk-create-blog-posts',
          icon: FaCloudUploadAlt,
        },

        { name: 'Push Notification', link: '/push-notification', icon: FaBell },
        { name: 'Categories', link: '/categories', icon: HiViewGridAdd },
        { name: 'Users', link: '/users', icon: FaUsers },
        { name: 'Update Profile', link: '/profile', icon: FiSettings },
        { name: 'Favorites Movies', link: '/favorites', icon: FaHeart },
        {
          name: 'Change Password',
          link: '/password',
          icon: RiLockPasswordLine,
        },
      ];
    }

    return [
      { name: 'Update Profile', link: '/profile', icon: FiSettings },
      { name: 'Favorites Movies', link: '/favorites', icon: FaHeart },
      {
        name: 'Change Password',
        link: '/password',
        icon: RiLockPasswordLine,
      },
    ];
  }, [userInfo, isAdmin]);

  const active = 'bg-customPurple text-white';
  const hover = 'hover:text-white hover:bg-main';
  const inActive =
    'rounded font-medium text-sm above-1000:text-xs mobile:text-xs transitions flex gap-3 mobile:gap-2 items-center p-4 above-1000:p-3 mobile:p-2';

  const getClass = (href) =>
    pathname === href ? `${active} ${inActive}` : `${inActive} ${hover}`;

  const logoutHandler = async () => {
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('redirectAfterLogin');
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    toast.success('Logged out successfully');
    window.location.href = '/login';
  };

  const sidebarAdRefreshKey = useMemo(() => {
    const raw = sidebarAdKey || pathname || 'sidebar';
    return String(raw).replace(/\//gi, '_');
  }, [sidebarAdKey, pathname]);

  return (
    <div className="container min-h-screen py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="bg-dry border border-border rounded-lg p-4 sticky top-24">
            <div className="flex flex-col gap-2">
              {links.map((l) => {
                const Icon = l.icon;

                return (
                  <SmartLink key={l.link} href={l.link} className={getClass(l.link)}>
                    <Icon />
                    {l.name}
                  </SmartLink>
                );
              })}

              {userInfo ? (
                <button
                  type="button"
                  onClick={logoutHandler}
                  className={`${inActive} ${hover} text-left`}
                >
                  <RiLogoutCircleLine />
                  Log Out
                </button>
              ) : (
                <SmartLink href="/login" className={`${inActive} ${hover}`}>
                  <RiLogoutCircleLine />
                  Login
                </SmartLink>
              )}
            </div>

            {ADS_ENABLED && showSidebarAd ? (
              <div className="hidden sm:block mt-6">
                <EffectiveGateSquareAd
                  refreshKey={`sidebar-${sidebarAdRefreshKey}`}
                  label="Advertisement"
                />
              </div>
            ) : null}
          </div>
        </aside>

        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  );
}
