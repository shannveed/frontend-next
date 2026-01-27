'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { BsCaretLeftFill, BsCaretRightFill } from 'react-icons/bs';

import MovieCard from '../movie/MovieCard';

function chunkArray(arr, size = 4) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * MobileGridSwiper (CRA parity)
 * - 2x2 grid per slide (4 items)
 * - left/right arrows
 * - loop only when more than 1 slide
 */
export default function MobileGridSwiper({
  movies = [],
  className = '',
  cardProps = {},
}) {
  const slides = useMemo(() => {
    const list = Array.isArray(movies) ? movies.filter(Boolean) : [];
    return chunkArray(list, 4);
  }, [movies]);

  const swiperRef = useRef(null);
  const prevEl = useRef(null);
  const nextEl = useRef(null);

  // Wire navigation buttons to Swiper instance (like your CRA code)
  useEffect(() => {
    if (
      !swiperRef.current ||
      !swiperRef.current.swiper ||
      !prevEl.current ||
      !nextEl.current
    )
      return;

    const swiper = swiperRef.current.swiper;

    swiper.params.navigation.prevEl = prevEl.current;
    swiper.params.navigation.nextEl = nextEl.current;

    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  }, [slides.length]);

  if (!slides.length) return null;

  const arrowBase =
    'absolute top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex-colo bg-customPurple/80 hover:bg-customPurple text-white rounded-full';

  return (
    <div className={`relative w-full ${className}`}>
      <Swiper
        ref={swiperRef}
        modules={[Navigation]}
        navigation={{
          prevEl: prevEl.current,
          nextEl: nextEl.current,
        }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevEl.current;
          swiper.params.navigation.nextEl = nextEl.current;
        }}
        speed={250}
        loop={slides.length > 1}
        watchOverflow
      >
        {slides.map((group, idx) => (
          <SwiperSlide key={idx}>
            <div className="grid grid-cols-2 gap-2">
              {group.map((m) => (
                <MovieCard key={m._id} movie={m} {...cardProps} />
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {slides.length > 1 && (
        <>
          <button
            ref={prevEl}
            aria-label="Previous"
            type="button"
            className={`${arrowBase} left-2`}
          >
            <BsCaretLeftFill className="text-sm" />
          </button>

          <button
            ref={nextEl}
            aria-label="Next"
            type="button"
            className={`${arrowBase} right-2`}
          >
            <BsCaretRightFill className="text-sm" />
          </button>
        </>
      )}
    </div>
  );
}
