'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IoClose } from 'react-icons/io5';
import { BsCollectionPlay } from 'react-icons/bs';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { BiPhoneCall } from 'react-icons/bi';
import { TbChevronDown } from 'react-icons/tb';
import { FaFacebook, FaTelegram, FaYoutube } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function MenuDrawer({ drawerOpen = false, toggleDrawer }) {
  const [openMenu, setOpenMenu] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const close = () => toggleDrawer?.();

  const handleSubMenu = (menuName) => {
    setOpenMenu((prev) => (prev === menuName ? '' : menuName));
  };

  // ✅ SPA navigation (fast) but still resets filters
  const goTo = (href) => {
    close();
    router.push(href);
    
  };

  const mainLinks = [
    {
      name: 'Movies',
      href: '/movies',
      icon: BsCollectionPlay,
      onClick: () => goTo('/movies')
    },
    {
      name: 'Hollywood',
      icon: HiOutlineUserGroup,
      children: [
        {
          name: 'Hollywood (English)',
          href: '/movies?browseBy=' + encodeURIComponent('Hollywood (English)')
        },
        {
          name: 'Hollywood (Hindi Dubbed)',
          href: '/movies?browseBy=' + encodeURIComponent('Hollywood (Hindi Dubbed)')
        }
      ]
    },
    {
      name: 'Indian',
      icon: HiOutlineUserGroup,
      children: [
        { name: 'Bollywood', href: '/movies?browseBy=' + encodeURIComponent('Bollywood') },
        {
          name: 'South Indian (Hindi Dubbed)',
          href: '/movies?browseBy=' + encodeURIComponent('South Indian (Hindi Dubbed)')
        }
      ]
    },
    {
      name: 'Web Series',
      icon: HiOutlineUserGroup,
      children: [
        {
          name: 'Hollywood (English)',
          href: '/movies?browseBy=' + encodeURIComponent('Hollywood Web Series (English)')
        },
        {
          name: 'Hollywood (Hindi Dubbed)',
          href: '/movies?browseBy=' + encodeURIComponent('Hollywood Web Series (Hindi Dubbed)')
        },
        { name: 'Bollywood', href: '/movies?browseBy=' + encodeURIComponent('Bollywood Web Series') }
      ]
    },
    {
      name: 'Browse By',
      icon: HiOutlineUserGroup,
      children: [
        { name: 'Pakistani Movies', href: '/movies?browseBy=' + encodeURIComponent('Pakistani Movies') },
        { name: 'Indian Punjabi Movies', href: '/movies?browseBy=' + encodeURIComponent('Indian Punjabi Movies') }
      ]
    },
    { name: 'Contact Us', href: '/contact-us', icon: BiPhoneCall }
  ];

  const socials = [
    { icon: FaFacebook, href: 'https://www.facebook.com/zpunet' },
    { icon: FaTelegram, href: 'https://t.me/zpunet' },
    { icon: FaYoutube, href: 'https://www.youtube.com/channel/' }
  ];

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-black/60"
        onClick={close}
      />

      {/* panel */}
      <div className="absolute top-0 left-0 h-full w-full max-w-md bg-main text-white border-r border-border">
        {/* header */}
        <div className="flex items-center justify-between h-16 px-6 bg-dry border-b border-border">
          <Link href="/" onClick={close}>
            <img src="/images/MOVIEFROST.png" alt="MovieFrost" className="w-28 h-12 object-contain" />
          </Link>

          <button
            onClick={close}
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Close menu"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* links */}
        <nav className="px-6 py-4 overflow-y-auto h-[calc(100%-64px-92px)]">
          <ul className="space-y-5">
            {mainLinks.map((item) => (
              <li key={item.name}>
                {!item.children ? (
                  item.onClick ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="flex items-center w-full text-left text-lg hover:text-customPurple transition"
                    >
                      <item.icon className="mr-4" />
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={close}
                      className="flex items-center text-lg hover:text-customPurple transition"
                    >
                      <item.icon className="mr-4" />
                      {item.name}
                    </Link>
                  )
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSubMenu(item.name)}
                      className="flex items-center justify-between w-full text-lg hover:text-customPurple transition"
                    >
                      <span className="flex items-center">
                        <item.icon className="mr-4" />
                        {item.name}
                      </span>
                      <TbChevronDown
                        className={`transition-transform ${openMenu === item.name ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {openMenu === item.name && (
                      <ul className="ml-9 mt-2 space-y-2">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={close}
                              className="block text-base text-white/90 hover:text-customPurple transition"
                            >
                              - {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* footer socials */}
        <div className="px-6 py-5 bg-dry border-t border-border">
          <div className="flex items-center justify-center gap-4">
            {socials.map((s, idx) => (
              <a
                key={idx}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded bg-white/10 hover:bg-customPurple transition"
              >
                <s.icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
