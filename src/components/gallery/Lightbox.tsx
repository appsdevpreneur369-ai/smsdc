'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Photo } from '@/lib/gallery';

export type LightboxStrings = { dialogLabel: string; close: string; previous: string; next: string; counter: string };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(v[k] ?? ''));

/**
 * Accessible photo viewer: ←/→ and Esc, swipe on touch screens, focus kept inside while open (focus returns to the
 * opener on close), caption + "3 / 12" counter, and the neighbouring photos preloaded.
 */
export function Lightbox({ photos, index, onIndex, onClose, strings }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void; strings: LightboxStrings }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const total = photos.length;
  const go = useCallback((d: number) => onIndex((index + d + total) % total), [index, total, onIndex]);

  // Latest handlers for the key listener, so the open-time effect runs once.
  const goRef = useRef(go);
  const closeFn = useRef(onClose);
  useEffect(() => {
    goRef.current = go;
    closeFn.current = onClose;
  }, [go, onClose]);

  useEffect(() => {
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFn.current();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goRef.current(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goRef.current(-1);
      } else if (e.key === 'Tab' && panelRef.current) {
        const f = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const photo = photos[index];
  const neighbours = total > 1 ? [photos[(index + 1) % total], photos[(index - 1 + total) % total]] : [];
  const btn = 'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={strings.dialogLabel}
      className="fixed inset-0 z-[80] flex flex-col bg-dark/95 text-white"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="font-heading text-sm font-semibold text-on-dark-muted" aria-live="polite">
          {fill(strings.counter, { n: index + 1, total })}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={strings.close} className={btn}>
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Image key={photo.id} src={photo.src} alt={photo.alt} fill sizes="100vw" className="object-contain px-2 sm:px-20" />
        {total > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={strings.previous} className={`${btn} absolute left-2 top-1/2 -translate-y-1/2 sm:left-5`}>
              <ChevronLeft className="h-7 w-7" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={strings.next} className={`${btn} absolute right-2 top-1/2 -translate-y-1/2 sm:right-5`}>
              <ChevronRight className="h-7 w-7" aria-hidden />
            </button>
          </>
        )}
      </div>
      <p className="px-4 py-4 text-center font-heading text-base font-semibold sm:px-6 sm:text-lg">{photo.caption}</p>
      {/* Preload the neighbours so next/previous shows instantly. */}
      <div aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        {neighbours.map((n) => (
          <Image key={n.id} src={n.src} alt="" width={n.width} height={n.height} sizes="100vw" loading="eager" />
        ))}
      </div>
    </div>,
    document.body,
  );
}
