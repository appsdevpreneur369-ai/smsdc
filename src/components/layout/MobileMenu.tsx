'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Phone, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Logo } from './Logo';
import type { HeaderProps } from './Header';
import { useAccount } from '@/components/account/AccountProvider';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Full-screen mobile navigation (loaded on demand by Header). */
export function MobileMenu({
  open,
  onClose,
  isActive,
  altHref,
  logo,
  items,
  cta,
  book,
  call,
  whatsapp,
  account,
  langSwitch,
  strings,
}: HeaderProps & { open: boolean; onClose: () => void; isActive: (h: string) => boolean; altHref: string }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
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
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden" id="mobile-menu">
          <motion.div
            className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={strings.menu}
            className="on-dark absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-dark text-white shadow-lift"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-[72px] items-center justify-between px-4">
              <Logo data={logo} inverted />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={strings.closeMenu}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <nav aria-label={strings.main} className="flex-1 px-4 py-4">
              <ul className="space-y-1">
                {[...items, cta].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={cn(
                        'group flex min-h-[52px] items-center px-4 font-heading text-lg font-medium outline-none transition-colors hover:text-accent focus-visible:outline-none',
                        isActive(item.href) && 'text-accent',
                      )}
                    >
                      <span className="relative py-1">
                        {item.label}
                        <span
                          className={cn(
                            'absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-accent transition-transform duration-200',
                            isActive(item.href) ? 'scale-x-100' : 'scale-x-0 opacity-60 group-focus-visible:scale-x-100',
                          )}
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-3 border-t border-white/10 px-4 py-6">
              <Link href={book.href} className="flex min-h-[52px] items-center justify-center rounded-full bg-accent font-heading font-semibold text-dark">
                {book.label}
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <a href={call.href} className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/30 font-heading text-sm font-semibold">
                  <Phone className="h-4 w-4" aria-hidden />
                  {call.label}
                </a>
                <a
                  href={whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-whatsapp font-heading text-sm font-semibold"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  {whatsapp.label}
                </a>
              </div>
              <Link href={account.href} className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/30 font-heading text-sm font-semibold">
                <UserRound className="h-4 w-4" aria-hidden />
                <MobileAccountLabel {...account} />
              </Link>
              <Link
                href={altHref}
                hrefLang={langSwitch.target}
                lang={langSwitch.target}
                aria-label={langSwitch.ariaLabel}
                className="flex min-h-[44px] items-center justify-center gap-2 text-sm text-on-dark-muted hover:text-white"
              >
                <Globe className="h-4 w-4" aria-hidden />
                {langSwitch.label}
              </Link>
              {langSwitch.note && <p className="text-center text-xs text-on-dark-muted">{langSwitch.note}</p>}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MobileAccountLabel({ signIn, myAccount }: HeaderProps['account']) {
  const { session } = useAccount();
  return <>{session ? myAccount : signIn}</>;
}
