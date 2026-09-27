import Link from 'next/link';
import { CalendarCheck, Mail, MapPin, Phone, Clock } from 'lucide-react';
import { brand, clinic, getImage, navigation, showPlaceholderBadges } from '@/lib/content';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { generalWhatsappHref, mailHref, mapsDirectionsHref, telHref } from '@/lib/links';
import { groupDays, formatSession } from '@/lib/hours';
import { fullAddress } from '@/lib/vars';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { DraftBadge } from '@/components/ui/primitives';
import { Header } from './Header';
import { Logo, type LogoData } from './Logo';

export function logoData(lang: Lang): LogoData {
  return {
    href: localePath(lang, '/'),
    iconSrc: getImage(brand.logo.icon).src,
    iconWhiteSrc: getImage(brand.logo.iconWhite).src,
    primary: brand.wordmark.primary,
    secondary: brand.wordmark.secondary,
    label: `${tx(clinic.displayName, lang)} — ${t(getDict(lang), 'nav.home')}`,
  };
}

export function TopBar({ lang }: { lang: Lang }) {
  const dict = getDict(lang);
  return (
    <div className="on-dark hidden bg-primary-dark text-white md:block">
      <div className="container flex h-10 items-center justify-between text-[0.8rem]">
        <p className="font-medium">{t(dict, navigation.topBarMessage)}</p>
        <div className="flex items-center gap-6">
          <a href={mailHref} className="inline-flex h-10 items-center gap-2 hover:text-accent">
            <Mail className="h-4 w-4" aria-hidden />
            {clinic.email}
          </a>
          <a href={telHref} className="inline-flex h-10 items-center gap-2 hover:text-accent">
            <Phone className="h-4 w-4" aria-hidden />
            {clinic.phone.display}
          </a>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ lang }: { lang: Lang }) {
  const dict = getDict(lang);
  const other: Lang = lang === 'en' ? 'te' : 'en';
  return (
    <Header
      lang={lang}
      logo={logoData(lang)}
      items={navigation.header.map((i) => ({ label: t(dict, i.key), href: localePath(lang, i.href) }))}
      cta={{ label: t(dict, navigation.headerCta.key), href: localePath(lang, navigation.headerCta.href) }}
      book={{ label: t(dict, 'cta.book'), href: localePath(lang, '/book') }}
      call={{ label: t(dict, 'cta.call'), href: telHref, display: clinic.phone.display }}
      whatsapp={{ label: t(dict, 'cta.whatsapp'), href: generalWhatsappHref(lang) }}
      langSwitch={{ label: t(dict, 'lang.switchTo'), ariaLabel: t(dict, 'lang.switchToLabel'), target: other, note: t(dict, 'lang.draftNote') }}
      strings={{ openMenu: t(dict, 'nav.openMenu'), closeMenu: t(dict, 'nav.closeMenu'), main: t(dict, 'nav.main'), menu: t(dict, 'nav.menu') }}
    />
  );
}

/** Desktop: two floating pills in the bottom corners. Mobile: sticky Call · WhatsApp · Book bar. */
export function FloatingActions({ lang }: { lang: Lang }) {
  const dict = getDict(lang);
  const wa = generalWhatsappHref(lang);
  const book = localePath(lang, '/book');
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden md:block">
        <div className="flex justify-between px-6">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-full bg-whatsapp px-5 font-heading text-sm font-semibold uppercase tracking-wide text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-whatsapp-hover"
          >
            <WhatsAppIcon />
            {t(dict, 'cta.whatsappUs')}
          </a>
          <Link
            href={book}
            className="pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-dark via-primary-dark to-primary px-5 font-heading text-sm font-semibold uppercase tracking-wide text-white shadow-lift ring-2 ring-accent/70 transition hover:-translate-y-0.5"
          >
            <CalendarCheck className="h-5 w-5 text-accent" aria-hidden />
            {t(dict, 'cta.book')}
          </Link>
        </div>
      </div>

      <nav
        aria-label={t(dict, 'cta.book')}
        className="on-dark fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-3">
          <a href={telHref} className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-semibold text-white">
            <Phone className="h-5 w-5" aria-hidden />
            {t(dict, 'cta.call')}
          </a>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-semibold text-white">
            <WhatsAppIcon className="h-5 w-5" />
            {t(dict, 'cta.whatsapp')}
          </a>
          <Link href={book} className="m-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl bg-accent text-xs font-bold text-dark">
            <CalendarCheck className="h-5 w-5" aria-hidden />
            {t(dict, 'cta.bookShort')}
          </Link>
        </div>
      </nav>
    </>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  const dict = getDict(lang);
  const year = new Date().getFullYear();
  const dayName = (d: string) => t(dict, `days.short.${d}`);
  return (
    <footer className="on-dark relative overflow-hidden bg-dark pb-24 text-on-dark-muted md:pb-0">
      <div className="dot-grid pointer-events-none absolute -right-10 top-10 h-40 w-64 opacity-20" aria-hidden />
      <div className="container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.2fr]">
        <div>
          <Logo data={logoData(lang)} inverted />
          <p className="mt-5 max-w-sm leading-relaxed">{tx(clinic.description, lang)}</p>
          <p className="mt-4 font-heading text-lg italic text-accent">“{tx(clinic.tagline, lang)}”</p>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold text-white">{t(dict, 'footer.quickLinks')}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1">
            {navigation.footerQuickLinks.map((l) => (
              <li key={l.href}>
                <Link href={localePath(lang, l.href)} className="inline-flex min-h-[44px] items-center hover:text-accent">
                  {t(dict, l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold text-white">{t(dict, 'footer.contact')}</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={mapsDirectionsHref} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-start gap-3 py-2 hover:text-accent">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>{fullAddress}</span>
              </a>
            </li>
            <li>
              <a href={telHref} className="flex min-h-[44px] items-center gap-3 hover:text-accent">
                <Phone className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                {clinic.phone.display}
              </a>
            </li>
            <li>
              <a href={generalWhatsappHref(lang)} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-3 hover:text-accent">
                <WhatsAppIcon className="h-5 w-5 shrink-0 text-accent" />
                {clinic.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={mailHref} className="flex min-h-[44px] items-center gap-3 break-all hover:text-accent">
                <Mail className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                {clinic.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <ul className="space-y-0.5">
                {groupDays(clinic.hours).map((g) => (
                  <li key={g.days[0]}>
                    <span className="font-semibold text-white">
                      {g.days.length > 1 ? `${dayName(g.days[0])}–${dayName(g.days[g.days.length - 1])}` : dayName(g.days[0])}:
                    </span>{' '}
                    {g.sessions.length ? g.sessions.map(formatSession).join(', ') : t(dict, 'hours.closed')}
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {clinic.officialName}. {t(dict, 'footer.rights')}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {navigation.footerLegal.map((l) => (
              <li key={l.href}>
                <Link href={localePath(lang, l.href)} className="inline-flex min-h-[44px] items-center hover:text-accent">
                  {t(dict, l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {(showPlaceholderBadges || lang === 'te') && (
          <div className="container pb-6 text-xs">
            <DraftBadge status="placeholder" lang={lang} className="mr-2" />
            {showPlaceholderBadges && t(dict, 'footer.placeholderNote')} {lang === 'te' && t(dict, 'lang.draftNote')}
          </div>
        )}
      </div>
    </footer>
  );
}
