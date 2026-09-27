import 'server-only';
import { booking, categories, clinic, doctors, routing } from '../content';
import { DAYS } from '../hours';
import { getDict, localePath, t, tx, type Lang } from '../i18n';
import { telHref } from '../links';
import { fullAddress } from '../vars';
import type { BookingClientConfig } from './config';
import { clinicflowApiConfig } from './serverConfig';
import { buildTreatmentGroups } from './treatments';

/** Everything the client booking UI needs, resolved from /content for one language. */
export function bookingClientConfig(lang: Lang): BookingClientConfig {
  const dict = getDict(lang);
  const api = clinicflowApiConfig();
  return {
    lang,
    preferredMode: booking.mode,
    api: { baseUrl: api.baseUrl, clinicSlug: api.clinicSlug, clinicId: api.clinicId },
    proxyBase: '/api/clinicflow',
    advanceDays: booking.advanceDays,
    otpResendSeconds: booking.otpResendSeconds,
    timezone: clinic.timezone,
    treatments: buildTreatmentGroups({
      generalGroupLabel: t(dict, 'bookingForm.generalGroup'),
      generalOption: { label: tx(booking.generalOption.label, lang), doctors: booking.generalOption.doctors },
      problems: routing.problems.map((p) => ({ id: p.id, label: tx(p.label, lang), doctors: p.doctors })),
      categories: categories.map((c) => ({
        slug: c.slug,
        title: tx(c.title, lang),
        doctors: c.doctors,
        subTreatments: c.subTreatments.map((s) => ({ slug: s.slug, title: tx(s.title, lang), doctors: s.doctors })),
      })),
      allowDirectSpecialistBooking: booking.allowDirectSpecialistBooking,
      defaultDoctor: booking.defaultDoctor,
    }),
    doctors: doctors.map((d) => ({
      slug: d.slug,
      displayName: d.displayName,
      firstName: d.firstName,
      lastName: d.lastName,
      clinicflowDoctorId: d.clinicflowDoctorId,
      consultation: d.consultation,
    })),
    clinic: {
      name: tx(clinic.displayName, lang),
      shortName: tx(clinic.shortName, lang),
      branchName: `${tx(clinic.shortName, lang)} — ${clinic.address.locality}`,
      address: fullAddress,
      mapsUrl: clinic.maps.shareUrl,
      whatsappDigits: clinic.whatsapp.e164.replace(/\D/g, ''),
      phoneDisplay: clinic.phone.display,
      telHref,
    },
    popup: booking.popup,
    consentText: tx(booking.consent, lang),
    privacyHref: localePath(lang, '/privacy'),
    whatsappTemplate: tx(booking.whatsappMessage, lang),
    enquiryTemplate: tx(booking.enquiryMessage, lang),
    note: tx(booking.note, lang),
    strings: dict.bookingForm as Record<string, string>,
    dayNames: Object.fromEntries(DAYS.map((d) => [d, t(dict, `days.${d}`)])),
  };
}
