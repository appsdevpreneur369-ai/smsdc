'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Desktop floating pills (WhatsApp / Book). They fade out while the footer is on screen so they never
 * cover footer content — the footer repeats the same WhatsApp, phone and booking links.
 */
export function FloatingDock({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0 });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  // `inert` takes hidden pills out of the tab order and pointer hit-testing (set as a DOM property;
  // React 18 has no first-class support for the attribute).
  useEffect(() => {
    if (ref.current) ref.current.inert = hidden;
  }, [hidden]);

  return (
    <div
      ref={ref}
      data-floating=""
      aria-hidden={hidden || undefined}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden transition-all duration-300 md:block',
        hidden ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100',
      )}
    >
      {children}
    </div>
  );
}
