'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { buttonClass } from '@/components/ui/primitives-client';
import { cn } from '@/lib/cn';
import { BookingForm } from './BookingForm';
import { isDirty, useBooking } from './BookingProvider';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible booking dialog: centred modal on desktop, full-height sheet on mobile. */
export function BookingModal() {
  const { isOpen, close, draft, config } = useBooking();
  const s = config.strings;
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const requestClose = useCallback(
    (source: 'x' | 'esc' | 'backdrop' | 'done') => {
      if (source === 'backdrop' && isDirty(draft)) {
        setConfirmDiscard(true);
        return;
      }
      setConfirmDiscard(false);
      close();
    },
    [draft, close],
  );

  // Latest values for the key handler, so the open-time effect below runs once per open (re-running it on
  // every keystroke would move focus back to the panel and drop typed characters).
  const requestCloseRef = useRef(requestClose);
  const confirmRef = useRef(confirmDiscard);
  useEffect(() => {
    requestCloseRef.current = requestClose;
    confirmRef.current = confirmDiscard;
  }, [requestClose, confirmDiscard]);

  // Scroll lock without layout shift (compensate for the scrollbar), initial focus, ESC and focus trap.
  useEffect(() => {
    if (!isOpen) return;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    // Focus the dialog itself (not an input) so the mobile keyboard doesn't pop up on an auto-open.
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmRef.current) setConfirmDiscard(false);
        else requestCloseRef.current('esc');
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setConfirmDiscard(false);
  }, [isOpen]);

  if (!mounted) return null;

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isMobile
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
      : { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => requestClose('backdrop')}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            data-booking-dialog=""
            tabIndex={-1}
            {...panelMotion}
            transition={{ duration: reduce ? 0.15 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex w-full flex-col bg-surface shadow-lift outline-none',
              'h-[100dvh] sm:h-auto sm:max-h-[min(92vh,900px)] sm:max-w-3xl sm:rounded-[1.75rem]',
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
              <div>
                <h2 id={headingId} className="text-2xl font-bold sm:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-1 font-medium text-primary-dark">{s.subtitle}</p>
              </div>
              <button type="button" onClick={() => requestClose('x')} aria-label={s.close} className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-secondary-soft">
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
              <BookingForm variant="modal" onDone={() => requestClose('done')} />
            </div>

            {confirmDiscard && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-ink/40 p-6" role="alertdialog" aria-modal="true" aria-labelledby={`${headingId}-discard`}>
                <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-lift">
                  <h3 id={`${headingId}-discard`} className="text-lg font-bold">
                    {s.discardTitle}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted">{s.discardText}</p>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                    <button type="button" autoFocus className={buttonClass('primary', 'sm')} onClick={() => setConfirmDiscard(false)}>
                      {s.keepEditing}
                    </button>
                    <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => requestClose('x')}>
                      {s.discard}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
