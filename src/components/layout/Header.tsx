'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Menu, Phone, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Logo, type LogoData } from './Logo';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { localePath, stripLang, type Lang } from '@/lib/i18n';

export type HeaderProps = {
  lang: Lang;
  logo: LogoData;
  items: { label: string; href: string }[];
  cta: { label: string; href: string };
  book: { label: string; href: string };
  call: { label: string; href: string; display: string };
  whatsapp: { label: string; href: string };
  langSwitch: { label: string; ariaLabel: string; target: Lang; note: string };
  strings: { openMenu: string; closeMenu: string; main: string; menu: string };
};

export function Header(props: HeaderProps) {
  const { logo, items, cta, langSwitch, strings } = props;
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const bare = stripLang(pathname);
  const altHref = localePath(langSwitch.target, bare);
  const isActive = (href: string) => {
    const h = stripLang(href);
    return h === '/' ? bare === '/' : bare === h || bare.startsWith(`${h}/`);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,box-shadow] duration-300',
        scrolled ? 'on-dark bg-dark/95 shadow-lift backdrop-blur' : 'bg-bg/80 backdrop-blur',
      )}
    >
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <Logo data={logo} inverted={scrolled} />

        <nav aria-label={strings.main} className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'relative whitespace-nowrap rounded-full px-2.5 py-2.5 font-heading text-[0.92rem] font-medium transition-colors xl:px-3',
                scrolled ? 'text-white/85 hover:text-white' : 'text-ink hover:text-primary',
                isActive(item.href) && (scrolled ? 'text-accent' : 'text-primary'),
              )}
            >
              {item.label}
              {isActive(item.href) && (
                <span className={cn('absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full', scrolled ? 'bg-accent' : 'bg-primary')} aria-hidden />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={cta.href}
            className={cn(
              'inline-flex min-h-[44px] items-center rounded-full border-2 px-5 font-heading text-sm font-semibold transition-colors',
              scrolled ? 'border-white/40 text-white hover:border-accent hover:text-accent' : 'border-primary text-primary hover:bg-primary hover:text-white',
            )}
          >
            {cta.label}
          </Link>
          <Link
            href={altHref}
            hrefLang={langSwitch.target}
            lang={langSwitch.target}
            aria-label={langSwitch.ariaLabel}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 font-heading text-sm font-medium transition-colors',
              scrolled ? 'text-white/85 hover:text-accent' : 'text-ink hover:text-primary',
            )}
          >
            <Globe className="h-4 w-4" aria-hidden />
            {langSwitch.label}
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href={altHref}
            hrefLang={langSwitch.target}
            lang={langSwitch.target}
            aria-label={langSwitch.ariaLabel}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1 rounded-full px-2.5 font-heading text-sm font-medium',
              scrolled ? 'text-white' : 'text-ink',
            )}
          >
            <Globe className="h-4 w-4" aria-hidden />
            {langSwitch.label}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={strings.openMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              scrolled ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-secondary-soft',
            )}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>

      <MobileMenu {...props} open={open} onClose={close} isActive={isActive} altHref={altHref} />
    </header>
  );
}

function MobileMenu({
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
        <div className="fixed inset-0 z-[60] lg:hidden" id="mobile-menu">
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
                        'flex min-h-[52px] items-center rounded-2xl px-4 font-heading text-lg font-medium transition-colors hover:bg-white/10',
                        isActive(item.href) && 'bg-white/10 text-accent',
                      )}
                    >
                      {item.label}
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
