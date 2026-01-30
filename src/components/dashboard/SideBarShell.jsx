// src/components/dashboard/SideBarShell.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

import { BsFillGridFill } from 'react-icons/bs';
import { FaListAlt, FaUsers, FaHeart, FaBell, FaCloudUploadAlt } from 'react-icons/fa';
import { RiMovie2Fill, RiLockPasswordLine, RiLogoutCircleLine } from 'react-icons/ri';
import { HiViewGridAdd } from 'react-icons/hi';
import { FiSettings } from 'react-icons/fi';

import { getUserInfo } from '../../lib/client/auth';

const isNextRoute = (href = '') =>
  href === '/' ||
  href === '/movies' ||
  href === '/favorites' ||
  href === '/profile' ||
  href === '/password' ||
  href === '/about-us' ||
  href === '/contact-us' ||
  href === '/dashboard' ||
  href === '/movieslist' ||
  href === '/addmovie' ||
  href === '/bulk-create' ||
  href === '/push-notification' ||
  href === '/categories' ||
  href === '/users' ||
  href.startsWith('/movies') ||
  href.startsWith('/movie/') ||
  href.startsWith('/watch/') ||
  href.startsWith('/edit/');

function SmartLink({ href, className, children }) {
  if (isNextRoute(href)) return <Link href={href} className={className}>{children}</Link>;
  return <a href={href} className={className}>{children}</a>;
}

export default function SideBarShell({ children }) {
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
        { name: 'Add Movie', link: '/addmovie', icon: RiMovie2Fill },
        { name: 'Bulk Create', link: '/bulk-create', icon: FaCloudUploadAlt },
        { name: 'Push Notification', link: '/push-notification', icon: FaBell },
        { name: 'Categories', link: '/categories', icon: HiViewGridAdd },
        { name: 'Users', link: '/users', icon: FaUsers },
        { name: 'Update Profile', link: '/profile', icon: FiSettings },
        { name: 'Favorites Movies', link: '/favorites', icon: FaHeart },
        { name: 'Change Password', link: '/password', icon: RiLockPasswordLine },
      ];
    }

    return [
      { name: 'Update Profile', link: '/profile', icon: FiSettings },
      { name: 'Favorites Movies', link: '/favorites', icon: FaHeart },
      { name: 'Change Password', link: '/password', icon: RiLockPasswordLine },
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
    // ✅ clears mf_token cookie on backend
    await fetch("/api/users/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("redirectAfterLogin");
    // keep same-tab UI updates
    window.dispatchEvent(new Event("storage"));
  } catch {}

  toast.success("Logged out successfully");
  window.location.href = "/login";
};

  return (
    <div className="min-h-screen container mx-auto px-2 mobile:px-0">
      <div className="xl:grid grid-cols-8 gap-10 above-1000:gap-8 mobile:gap-0 items-start md:py-12 py-6 above-1000:py-8 mobile:py-2">
        <aside className="col-span-2 sticky bg-dry border border-gray-800 p-6 above-1000:p-4 mobile:p-3 rounded-md xl:mb-0 mb-5 mobile:mb-3">
          {links.map((l) => (
            <SmartLink key={l.link} href={l.link} className={getClass(l.link)}>
              <l.icon className="above-1000:text-sm mobile:text-xs" />
              <p className="mobile:text-xs">{l.name}</p>
            </SmartLink>
          ))}

          {userInfo ? (
            <button
              onClick={logoutHandler}
              className={`${inActive} ${hover} w-full`}
              type="button"
            >
              <RiLogoutCircleLine className="above-1000:text-sm mobile:text-xs" />
              <span className="mobile:text-xs">Log Out</span>
            </button>
          ) : (
            <a href="/login" className={`${inActive} ${hover} w-full`}>
              Login
            </a>
          )}
        </aside>

        <main className="col-span-6 rounded-md bg-dry border border-gray-800 p-6 above-1000:p-4 mobile:p-3">
          {children}
        </main>
      </div>
    </div>
  );
}
