import { booking, clinic } from './content';
import { localePath, tx, type Lang, type Vars } from './i18n';

export const telHref = `tel:${clinic.phone.e164}`;
export const mailHref = `mailto:${clinic.email}`;

export function whatsappHref(message?: string): string {
  const number = clinic.whatsapp.e164.replace(/\D/g, '');
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function generalWhatsappHref(lang: Lang): string {
  return whatsappHref(tx(booking.generalWhatsappMessage, lang, { clinic: tx(clinic.shortName, lang) }));
}

/** Resolve a content href: site path, '@call', '@whatsapp' or an absolute URL. */
export function resolveHref(href: string, lang: Lang): { href: string; external: boolean } {
  if (href === '@call') return { href: telHref, external: false };
  if (href === '@whatsapp') return { href: generalWhatsappHref(lang), external: true };
  if (href.startsWith('http')) return { href, external: true };
  return { href: localePath(lang, href), external: false };
}

export const mapsDirectionsHref = clinic.maps.shareUrl;

export function mapEmbedSrc(): string {
  if (clinic.maps.embedUrl) return clinic.maps.embedUrl;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${clinic.officialName}, ${clinic.maps.embedQuery}`)}&output=embed`;
}

export type { Vars };
