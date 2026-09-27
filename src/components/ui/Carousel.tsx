'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Scroll-snap carousel with prev/next buttons. Works with touch, keyboard (Tab) and no JS. */
export function Carousel({ children, prevLabel, nextLabel, label }: { children: ReactNode; prevLabel: string; nextLabel: string; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const item = el.querySelector('li');
    el.scrollBy({ left: dir * ((item?.clientWidth ?? 300) + 24), behavior: 'smooth' });
  };

  const btn = 'flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-primary shadow-soft transition hover:bg-primary hover:text-white disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-primary';

  return (
    <div>
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-6 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[calc((100%-72px)/4)]">{child}</li>
        ))}
      </ul>
      <div className={cn('mt-2 flex justify-center gap-3', edges.start && edges.end && 'hidden')}>
        <button type="button" className={btn} onClick={() => scroll(-1)} disabled={edges.start} aria-label={prevLabel}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => scroll(1)} disabled={edges.end} aria-label={nextLabel}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
