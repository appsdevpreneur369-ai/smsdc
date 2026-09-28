'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Globe, Menu, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Logo, type LogoData } from './Logo';

// Mobile menu (and its animation library) loads after the page is interactive: nothing in it is needed for first paint.
const MobileMenu = dynamic(() => import('./MobileMenu').then((m) => m.MobileMenu), { ssr: false });
import { useAccount } from '@/components/account/AccountProvider';
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
  /** Patient account page; the label switches to "My account" once signed in. */
  account: { href: string; signIn: string; myAccount: string };
  langSwitch: { label: string; ariaLabel: string; target: Lang; note: string };
  strings: { openMenu: string; closeMenu: string; main: string; menu: string };
};

export function Header(props: HeaderProps) {
  const { logo, items, cta, account, langSwitch, strings } = props;
  const { session } = useAccount();
  const accountLabel = session ? account.myAccount : account.signIn;
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
  // The booking modal asks the menu to close before it opens (it is a separate dialog).
  useEffect(() => {
    window.addEventListener('smsdc:close-menu', close);
    return () => window.removeEventListener('smsdc:close-menu', close);
  }, [close]);

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

        <nav aria-label={strings.main} className="hidden items-center gap-0.5 xl:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                // No outline/ring ever (it showed as a rounded box after clicks); the underline is the only
                // active marker, and a softer underline is the keyboard-only (:focus-visible) indicator.
                'group relative whitespace-nowrap px-3 py-3 font-heading text-[0.92rem] font-medium outline-none transition-colors focus-visible:outline-none',
                scrolled ? 'text-white/85 hover:text-white' : 'text-ink hover:text-primary',
                isActive(item.href) && (scrolled ? 'text-accent' : 'text-primary'),
              )}
            >
              {item.label}
              <span
                className={cn(
                  'absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full transition-transform duration-200',
                  scrolled ? 'bg-accent' : 'bg-primary',
                  isActive(item.href) ? 'scale-x-100' : 'scale-x-0 opacity-60 group-focus-visible:scale-x-100',
                )}
                aria-hidden
              />
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
            href={account.href}
            aria-label={accountLabel}
            title={accountLabel}
            aria-current={isActive(account.href) ? 'page' : undefined}
            data-account-link={session ? 'signed-in' : 'signed-out'}
            className={cn(
              'relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              scrolled ? 'text-white/85 hover:bg-white/10 hover:text-accent' : 'text-ink hover:bg-secondary-soft hover:text-primary',
            )}
          >
            <UserRound className="h-5 w-5" aria-hidden />
            {session && <span className={cn('absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-success ring-2', scrolled ? 'ring-dark' : 'ring-bg')} aria-hidden />}
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

        <div className="flex items-center gap-1 xl:hidden">
          <Link
            href={altHref}
            hrefLang={langSwitch.target}
            lang={langSwitch.target}
            aria-label={langSwitch.ariaLabel}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full px-2.5 font-heading text-sm font-medium lg:hidden',
              scrolled ? 'text-white' : 'text-ink',
            )}
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{langSwitch.label}</span>
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
