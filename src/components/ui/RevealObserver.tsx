'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Scroll reveal. Content is server-rendered visible. After hydration, only [data-reveal] elements that are
 * still below the fold get `.reveal-pending` (hidden) and fade in when scrolled to. Nothing in the first
 * viewport is ever hidden, so LCP and no-JS/hidden-tab rendering are unaffected. See globals.css.
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
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.remove('reveal-pending');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px' },
    );
    const scan = () =>
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-seen])').forEach((el) => {
        el.dataset.revealSeen = '';
        if (el.getBoundingClientRect().top > window.innerHeight) {
          el.classList.add('reveal-pending');
          io.observe(el);
        }
      });
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
