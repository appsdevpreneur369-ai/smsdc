import { Mail, MapPin, Phone } from 'lucide-react';
import { clinic } from '@/lib/content';
import { DAYS } from '@/lib/hours';
import { getDict, t, type Lang } from '@/lib/i18n';
import { generalWhatsappHref, mailHref, mapEmbedSrc, mapsDirectionsHref, telHref } from '@/lib/links';
import { fullAddress } from '@/lib/vars';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { buttonClass } from '@/components/ui/primitives';
import type { HoursStrings } from './Hours';
import type { Day } from '@/lib/content/schemas';

export function hoursStrings(lang: Lang): HoursStrings {
  const dict = getDict(lang);
  const k = (key: string) => t(dict, `hours.${key}`);
  return {
    openNow: k('openNow'),
    closedNow: k('closedNow'),
    opensAt: dict.hours.opensAt,
    closesAt: dict.hours.closesAt,
    today: k('today'),
    tomorrow: k('tomorrow'),
    closed: k('closed'),
    day: k('day'),
    morning: k('morning'),
    evening: k('evening'),
    todayLabel: k('todayLabel'),
    title: k('title'),
    timings: k('timings'),
    dayNames: Object.fromEntries(DAYS.map((d) => [d, t(dict, `days.${d}`)])) as Record<Day, string>,
  };
}

export function ContactList({ lang, dark }: { lang: Lang; dark?: boolean }) {
  const dict = getDict(lang);
  const row = 'flex items-start gap-4 rounded-2xl p-3 transition-colors ' + (dark ? 'hover:bg-white/5' : 'hover:bg-secondary-soft/70');
  const tile = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' + (dark ? 'bg-white/10 text-accent' : 'bg-primary text-white');
  const label = 'block text-xs font-semibold uppercase tracking-wider ' + (dark ? 'text-on-dark-muted' : 'text-ink-muted');
  const value = 'block font-heading font-semibold ' + (dark ? 'text-white' : 'text-ink');
  return (
    <ul className="space-y-1">
      <li>
        <a href={mapsDirectionsHref} target="_blank" rel="noopener noreferrer" className={row}>
          <span className={tile}><MapPin className="h-5 w-5" aria-hidden /></span>
          <span><span className={label}>{t(dict, 'contact.address')}</span><span className={value}>{fullAddress}</span></span>
        </a>
      </li>
      <li>
        <a href={telHref} className={row}>
          <span className={tile}><Phone className="h-5 w-5" aria-hidden /></span>
          <span><span className={label}>{t(dict, 'contact.phone')}</span><span className={value}>{clinic.phone.display}</span></span>
        </a>
      </li>
      <li>
        <a href={generalWhatsappHref(lang)} target="_blank" rel="noopener noreferrer" className={row}>
          <span className={tile}><WhatsAppIcon className="h-5 w-5" /></span>
          <span><span className={label}>{t(dict, 'contact.whatsapp')}</span><span className={value}>{clinic.whatsapp.display}</span></span>
        </a>
      </li>
      <li>
        <a href={mailHref} className={row}>
          <span className={tile}><Mail className="h-5 w-5" aria-hidden /></span>
          <span className="min-w-0"><span className={label}>{t(dict, 'contact.email')}</span><span className={value + ' break-all'}>{clinic.email}</span></span>
        </a>
      </li>
    </ul>
  );
}

export function MapEmbed({ lang, className }: { lang: Lang; className?: string }) {
  const dict = getDict(lang);
  return (
    <div className={className}>
      <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-brand border border-line bg-secondary-soft shadow-soft">
        <iframe
          src={mapEmbedSrc()}
          title={t(dict, 'contact.mapTitle')}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {!clinic.maps.embedUrl && <p className="text-xs text-ink-muted">{t(dict, 'contact.mapNote')}</p>}
        <a href={mapsDirectionsHref} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}>
          <MapPin className="h-4 w-4" aria-hidden />
          {t(dict, 'cta.directions')}
        </a>
      </div>
    </div>
  );
}
