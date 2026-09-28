'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Expand } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Photo } from '@/lib/gallery';
import { Lightbox, type LightboxStrings } from './Lightbox';
import { PhotoThumb } from './PhotoThumb';

type Strings = LightboxStrings & { all: string; filterLabel: string; open: string };

const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

/**
 * Filterable photo grid + lightbox. Every photo is in the server HTML (indexable); the chips only filter on the client
 * and keep ?category= in the URL (no reload), so a filtered view can be shared.
 */
export function GalleryGrid({ photos, categories, strings }: { photos: Photo[]; categories: { id: string; label: string }[]; strings: Strings }) {
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Read the filter from the URL after mount (the page itself is static).
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('category');
    if (c && categories.some((x) => x.id === c)) setCategory(c);
  }, [categories]);

  const choose = (c: string) => {
    setCategory(c);
    const url = new URL(window.location.href);
    if (c === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', c);
    window.history.replaceState(window.history.state, '', url);
  };

  const shown = useMemo(() => (category === 'all' ? photos : photos.filter((p) => p.category === category)), [photos, category]);

  const close = useCallback(() => {
    const i = open;
    setOpen(null);
    if (i !== null) requestAnimationFrame(() => tileRefs.current[i]?.focus());
  }, [open]);

  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      aria-pressed={category === id}
      onClick={() => choose(id)}
      className={cn(
        'min-h-[44px] rounded-full border px-5 font-heading text-sm font-semibold transition-colors',
        category === id ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary hover:text-primary',
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      {categories.length > 1 && (
        <div role="group" aria-label={strings.filterLabel} className="mb-8 flex flex-wrap gap-2">
          {chip('all', strings.all)}
          {categories.map((c) => chip(c.id, c.label))}
        </div>
      )}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-gallery-grid="">
        {shown.map((p, i) => (
          <li key={p.id}>
            <figure className="group overflow-hidden rounded-brand border border-line bg-surface shadow-soft">
              <button
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setOpen(i)}
                aria-label={fill(strings.open, { caption: p.caption })}
                className="relative block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <PhotoThumb photo={p} sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-dark/60 text-white opacity-0 transition group-hover:opacity-100" aria-hidden>
                  <Expand className="h-4 w-4" />
                </span>
              </button>
              <figcaption className="p-4 font-heading font-semibold">{p.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {open !== null && shown[open] && <Lightbox photos={shown} index={open} onIndex={setOpen} onClose={close} strings={strings} />}
    </>
  );
}
