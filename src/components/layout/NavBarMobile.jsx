'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CgMenuBoxed } from 'react-icons/cg';
import { FaSearch } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { SidebarContext } from '../../context/DrawerContext';

export default function NavBarMobile() {
  const router = useRouter();
  const sidebar = useContext(SidebarContext);

  const toggleDrawer = sidebar?.toggleDrawer;

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const mobileSearchRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  useEffect(() => {
    if (!mobileSearchOpen) return;

    const t = setTimeout(() => {
      mobileSearchInputRef.current?.focus?.();
    }, 0);

    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  useEffect(() => {
    const onDown = (e) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const controller = new AbortController();

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies?search=${encodeURIComponent(term)}&pageNumber=1`,
          { signal: controller.signal }
        );

        const data = await res.json().catch(() => null);
        const list = Array.isArray(data?.movies) ? data.movies : [];

        setSearchResults(list.slice(0, 5));
        setShowDropdown(true);
      } catch {
        // ignore
      }
    }, 200);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search]);

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setShowDropdown(false);
  };

  const openMobileSearch = () => {
    setMobileSearchOpen(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = search.trim();

    if (!term) {
      router.push('/movies');
      setShowDropdown(false);
      setMobileSearchOpen(false);
      return;
    }

    router.push(`/movies?search=${encodeURIComponent(term)}`);
    setShowDropdown(false);
    setMobileSearchOpen(false);
  };

  const handleSuggestionPick = () => {
    setShowDropdown(false);
    setSearch('');
    setMobileSearchOpen(false);
  };

  return (
    <div className="bg-main shadow-md sticky top-0 z-20 lg:hidden border-b border-border">
      {!mobileSearchOpen ? (
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={openMobileSearch}
            className="w-9 h-9 flex-colo rounded-md bg-dry border border-border hover:border-customPurple transitions"
            aria-label="Open search"
            title="Search"
          >
            <FaSearch className="text-lg text-white" />
          </button>

          <Link href="/" aria-label="Go to home" className="flex-rows">
            <img
              src="/images/MOVIEFROST.png"
              alt="MovieFrost"
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              setMobileSearchOpen(false);
              toggleDrawer?.();
            }}
            className="w-9 h-9 flex-colo rounded-md bg-dry border border-border hover:border-customPurple transitions"
            aria-label="Open menu"
            title="Menu"
          >
            <CgMenuBoxed className="text-2xl text-white" />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2" ref={mobileSearchRef}>
            <button
              type="button"
              onClick={closeMobileSearch}
              className="w-10 h-10 flex-colo rounded-md bg-dry border border-border hover:border-customPurple transitions"
              aria-label="Close search"
              title="Close"
            >
              <IoClose className="text-xl text-white" />
            </button>

            <div className="flex-1 relative">
              <form
                onSubmit={handleSearchSubmit}
                className="w-full text-sm bg-black rounded flex-btn gap-2 border-2 border-customPurple"
              >
                <button
                  type="submit"
                  className="bg-customPurple w-10 flex-colo h-10 rounded-sm text-white"
                  aria-label="Search movies"
                >
                  <FaSearch className="text-base" />
                </button>

                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Movie Name"
                  className="font-medium placeholder:text-border text-sm w-11/12 h-10 bg-transparent border-none px-2 text-white"
                />

                {search ? (
                  <button
                    type="button"
                    className="pr-2 text-customPurple hover:text-white"
                    onClick={() => {
                      setSearch('');
                      setSearchResults([]);
                      setShowDropdown(false);
                      router.push('/movies');
                    }}
                    aria-label="Clear search"
                  >
                    <IoClose size={20} />
                  </button>
                ) : null}
              </form>

              {showDropdown && searchResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-full mt-1 bg-dry border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchResults.map((m) => (
                    <Link
                      key={m._id}
                      href={`/movie/${m.slug || m._id}`}
                      onClick={handleSuggestionPick}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-main transitions border-b border-border/50 last:border-b-0"
                    >
                      <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-main">
                        <img
                          src={m?.titleImage || '/images/placeholder.jpg'}
                          alt={m?.name || 'Movie'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.jpg';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {m.name}
                        </p>
                        <p className="text-xs text-dryGray truncate">
                          {m.year} • {m.category}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
