'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useInView()
 * - SSR-safe (client only)
 * - once=true means it becomes "true" once and stays true
 */
export default function useInView({
  root = null,
  rootMargin = '300px',
  threshold = 0.01,
  once = true,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView && once) return;

    const el = ref.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { root, rootMargin, threshold }
    );

    obs.observe(el);

    return () => obs.disconnect();
  }, [root, rootMargin, threshold, once, inView]);

  return [ref, inView];
}
