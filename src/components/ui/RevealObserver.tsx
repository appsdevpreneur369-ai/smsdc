'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Adds `.is-in` to [data-reveal] elements as they scroll into view. See globals.css `.reveal-on`. */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('reveal-on')) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px' },
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

/** Inline, runs before paint: enable reveal animations only for visible pages with motion allowed. */
export const revealBootScript = `(function(){try{var d=document.documentElement;if(document.visibilityState!=='hidden'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){d.classList.add('reveal-on')}}catch(e){}})();`;
