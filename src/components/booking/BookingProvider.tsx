'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { BookingClientConfig } from '@/lib/booking/config';
import { autoOpenDelayMs, barePath, canAutoOpen } from '@/lib/booking/popupRules';
import { resolveBookingService, type ResolvedBooking } from '@/lib/booking/services';
import { readPopupState, writePopupState } from '@/lib/booking/storage';
import { resolvePrefill } from '@/lib/booking/treatments';
import dynamic from 'next/dynamic';

// The popup (form, framer-motion, account panel) is loaded after the page is interactive, not in every page's
// first bundle: it only matters once someone clicks Book or the timed auto-open fires.
const BookingModal = dynamic(() => import('./BookingModal').then((m) => m.BookingModal), { ssr: false });

export type BookingDraft = {
  fullName: string;
  phone: string;
  email: string;
  branchId: string;
  treatmentId: string;
  preferredDoctor: string | null;
  date: string;
  /** "HH:mm|doctorSlug" for live slots, "HH:mm-HH:mm" or "" (any time) for preferred time. */
  time: string;
  consent: boolean;
  honeypot: string;
  /** Guest (phone OTP) or patient account; '' = not chosen yet (account when signed in, else guest). */
  who: '' | 'guest' | 'account';
};

export const emptyDraft: BookingDraft = {
  fullName: '',
  phone: '',
  email: '',
  branchId: '',
  treatmentId: '',
  preferredDoctor: null,
  date: '',
  time: '',
  consent: false,
  honeypot: '',
  who: '',
};

export const isDirty = (d: BookingDraft) => !!(d.fullName || d.phone || d.email || d.treatmentId || d.date || d.time || d.consent);

type Prefill = { problem?: string | null; treatment?: string | null; doctor?: string | null };

type Ctx = {
  config: BookingClientConfig;
  isOpen: boolean;
  open: (opts?: { prefill?: Prefill; opener?: HTMLElement | null }) => void;
  close: () => void;
  draft: BookingDraft;
  setDraft: (u: Partial<BookingDraft> | ((d: BookingDraft) => BookingDraft)) => void;
  resetDraft: () => void;
  applyPrefill: (p: Prefill) => void;
  resolved: ResolvedBooking | null;
  ensureResolved: () => Promise<ResolvedBooking>;
  markBooked: () => void;
};

const BookingContext = createContext<Ctx | null>(null);

export function useBooking(): Ctx {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}

/** Another modal (e.g. the mobile menu) is open — the popup waits for it to close. */
const otherDialogOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-booking-dialog])');

export function BookingProvider({ config, children }: { config: BookingClientConfig; children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraftState] = useState<BookingDraft>(emptyDraft);
  const [resolved, setResolved] = useState<ResolvedBooking | null>(null);
  const resolving = useRef<Promise<ResolvedBooking> | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const shownThisPage = useRef(false);

  const setDraft = useCallback((u: Partial<BookingDraft> | ((d: BookingDraft) => BookingDraft)) => {
    setDraftState((d) => (typeof u === 'function' ? u(d) : { ...d, ...u }));
  }, []);
  const resetDraft = useCallback(() => setDraftState(emptyDraft), []);

  const ensureResolved = useCallback(() => {
    if (!resolving.current) {
      resolving.current = resolveBookingService(config).then((r) => {
        setResolved(r);
        return r;
      });
    }
    return resolving.current;
  }, [config]);

  const applyPrefill = useCallback(
    (p: Prefill) => {
      if (!p.problem && !p.treatment && !p.doctor) return;
      const { treatmentId, preferredDoctor } = resolvePrefill(config.treatments, p);
      setDraftState((d) => ({ ...d, treatmentId: treatmentId ?? d.treatmentId, preferredDoctor, date: '', time: '' }));
    },
    [config.treatments],
  );

  const open = useCallback(
    (opts?: { prefill?: Prefill; opener?: HTMLElement | null; auto?: boolean }) => {
      openerRef.current = opts?.opener ?? (document.activeElement as HTMLElement | null);
      if (opts?.prefill) applyPrefill(opts.prefill);
      shownThisPage.current = true;
      writePopupState('opened');
      window.dispatchEvent(new Event('smsdc:close-menu'));
      setIsOpen(true);
      void ensureResolved();
    },
    [applyPrefill, ensureResolved],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    writePopupState('closed');
    const el = openerRef.current;
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus({ preventScroll: true }));
  }, []);

  const markBooked = useCallback(() => writePopupState('booked'), []);

  // Warm the health check shortly after load (idle), so the popup/buttons open straight into the right mode.
  useEffect(() => {
    const t = setTimeout(() => {
      const run = () => void ensureResolved();
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
      else run();
    }, 3000);
    return () => clearTimeout(t);
  }, [ensureResolved]);

  // Every "Book Appointment" link (/book or /te/book, with optional ?problem/treatment/doctor) opens the modal.
  // Capture phase: runs before next/link's own click handler, which then sees defaultPrevented and skips navigation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank') return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || barePath(url.pathname) !== '/book') return;
      if (barePath(window.location.pathname) === '/book') return; // the page itself shows the full form
      e.preventDefault();
      const q = url.searchParams;
      open({ prefill: { problem: q.get('problem'), treatment: q.get('treatment'), doctor: q.get('doctor') }, opener: a });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open]);

  // Auto-open after the configured delay, once per session, never on excluded pages or over another dialog.
  useEffect(() => {
    shownThisPage.current = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const eligible = () =>
      canAutoOpen({
        config: config.popup,
        pathname,
        isMobile: window.matchMedia('(max-width: 639px)').matches,
        sessionState: readPopupState(),
        shownThisPage: shownThisPage.current,
      });
    if (!eligible()) return;
    const timer = setTimeout(() => {
      const tryOpen = () => {
        if (!eligible()) {
          if (poll) clearInterval(poll);
          return;
        }
        if (otherDialogOpen()) return; // wait until it closes
        if (poll) clearInterval(poll);
        open({ opener: null, auto: true });
      };
      tryOpen();
      if (!shownThisPage.current) poll = setInterval(tryOpen, 1000);
    }, autoOpenDelayMs(config.popup));
    return () => {
      clearTimeout(timer);
      if (poll) clearInterval(poll);
    };
  }, [pathname, config.popup, open]);

  const value = useMemo<Ctx>(
    () => ({ config, isOpen, open, close, draft, setDraft, resetDraft, applyPrefill, resolved, ensureResolved, markBooked }),
    [config, isOpen, open, close, draft, setDraft, resetDraft, applyPrefill, resolved, ensureResolved, markBooked],
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal />
    </BookingContext.Provider>
  );
}
