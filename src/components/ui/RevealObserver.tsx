'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Scroll reveal. Content is server-rendered visible. After hydration, only [data-reveal] elements that are
 * still below the fold get `.reveal-pending` (hidden) and fade in when scrolled to. Nothing in the first
 * viewport is ever hidden, so LCP and no-JS/hidden-tab rendering are unaffected. See globals.css.
 * Geometry comes from IntersectionObserver entries (no getBoundingClientRect), so there is no forced layout.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (
      document.visibilityState !== 'visible' ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const classified = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!classified.has(e.target)) {
            classified.add(e.target);
            // First report: hide only if it starts below the fold; otherwise leave it alone.
            if (!e.isIntersecting && e.boundingClientRect.top > (e.rootBounds?.height ?? window.innerHeight)) {
              e.target.classList.add('reveal-pending');
              continue;
            }
            io.unobserve(e.target);
            continue;
          }
          if (e.isIntersecting) {
            e.target.classList.remove('reveal-pending');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px' },
    );
    const seen = new WeakSet<Element>();
    const scan = () =>
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
