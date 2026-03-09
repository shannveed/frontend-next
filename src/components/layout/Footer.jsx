// src/components/layout/Footer.jsx
import React from 'react';
import Link from 'next/link';

const NextLinkOrA = ({ href, className, children }) => {
  const isNext =
    href === '/' ||
    href === '/movies' ||
    href === '/favorites' ||
    href === '/profile' ||
    href === '/about-us' ||
    href === '/contact-us' ||
    href === '/dmca' ||
    href === '/privacy-policy' ||
    href === '/terms-of-service' ||
    href.startsWith('/movie/') ||
    href.startsWith('/watch/') ||
    href.startsWith('/movies') ||
    href.startsWith('/genre/') ||
    href.startsWith('/industry/') ||
    href.startsWith('/language/') ||
    href.startsWith('/year/');

  if (!isNext) return <a href={href} className={className}>{children}</a>;
  return <Link href={href} className={className}>{children}</Link>;
};

export default function Footer() {
  const Links = [
    {
      title: 'Company',
      links: [
        { name: 'Home', link: '/' },
        { name: 'About Us', link: '/about-us' },
        { name: 'Contact Us', link: '/contact-us' },
        { name: 'Movies', link: '/movies' },
      ],
    },
    {
      title: 'Top Categories',
      links: [
        { name: 'Action', link: '/genre/action' },
        { name: 'Romantic', link: '/genre/romantic' },
        { name: 'Drama', link: '/genre/drama' },
        { name: 'Historical', link: '/genre/historical' },
      ],
    },
    {
      title: 'My Account',
      links: [
        { name: 'Dashboard', link: '/dashboard' },
        { name: 'My Favorites', link: '/favorites' },
        { name: 'Profile', link: '/profile' },
        { name: 'Change Password', link: '/password' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'DMCA', link: '/dmca' },
        { name: 'Privacy Policy', link: '/privacy-policy' },
        { name: 'Terms of Service', link: '/terms-of-service' },
      ],
    },
  ];

  return (
    <div className="bg-dry border-t-2 border-black">
      <div className="container px-2 mobile:px-4 mobile:pl-6">
        <div className="grid grid-cols-2 md:grid-cols-8 xl:grid-cols-14 gap-5 sm:gap-9 lg:gap-11 xl:gap-7 py-10 justify-between">
          {Links.map((link, index) => (
            <div
              key={index}
              className="col-span-1 md:col-span-2 lg:col-span-3 pb-3.5 sm:pb-0"
            >
              <h3 className="text-md lg:leading-7 font-medium mb-4 sm:mb-5 lg:mb-6 pb-0.5">
                {link.title}
              </h3>
              <ul className="text-sm flex flex-col space-y-3">
                {link.links.map((text, idx) => (
                  <li key={idx} className="flex items-baseline">
                    <NextLinkOrA
                      href={text.link}
                      className="text-border inline-block w-full hover:text-customPurple"
                    >
                      {text.name}
                    </NextLinkOrA>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pb-3.5 sm:pb-0 col-span-1 md:col-span-2 lg:col-span-2">
            <Link href="/">
              <img
                src="/images/MOVIEFROST.png"
                alt="MovieFrost logo"
                width={150}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-2/4 object-contain h-12"
              />
            </Link>

            <p className="leading-7 text-sm text-border mt-3">
              <span>Box No. 76706, Dubai, UAE</span>
              <br />
              <span>Email: support@moviefrost.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
