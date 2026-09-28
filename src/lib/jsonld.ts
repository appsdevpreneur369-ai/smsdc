import { clinic, getImage, brand, reviews } from './content';
import { photosFor } from './gallery';
import type { Doctor, FaqItem } from './content/schemas';
import { localePath, tx, type Lang } from './i18n';
import { absoluteUrl } from './seo';

const dayMap: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const clinicId = () => `${absoluteUrl('/')}#clinic`;

/** Dentist + MedicalClinic for the clinic itself. */
export function clinicJsonLd(lang: Lang) {
  // Only real profiles: empty socialLinks entries are left out.
  const sameAs = Object.values(clinic.socialLinks).filter((u): u is string => typeof u === 'string' && u.length > 0);
  const specs = clinic.hours.flatMap((h) =>
    h.sessions.map((s) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: dayMap[h.day], opens: s.opens, closes: s.closes })),
  );
  return {
    '@context': 'https://schema.org',
    '@type': ['Dentist', 'MedicalClinic'],
    '@id': clinicId(),
    name: clinic.officialName,
    alternateName: tx(clinic.shortName, 'en'),
    slogan: tx(clinic.tagline, 'en'),
    description: tx(clinic.description, lang),
    url: absoluteUrl(localePath(lang, '/')),
    logo: absoluteUrl(getImage(brand.logo.appIcon).src),
    // Real clinic photos first (entrance, treatment room); the logo when there are none yet.
    image: (photosFor('about', 'en').length ? photosFor('about', 'en').map((p) => p.src) : [getImage(brand.logo.appIcon).src]).map(absoluteUrl),
    telephone: clinic.phone.e164,
    email: clinic.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinic.address.street,
      addressLocality: clinic.address.locality,
      addressRegion: clinic.address.region,
      postalCode: clinic.address.postalCode,
      addressCountry: clinic.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: clinic.geo.lat, longitude: clinic.geo.lng },
    hasMap: clinic.maps.shareUrl,
    openingHoursSpecification: specs,
    areaServed: [clinic.serviceAreas.primary, ...clinic.serviceAreas.nearby].map((name) => ({ '@type': 'Place', name })),
    knowsLanguage: clinic.languages, // (availableLanguage isn't a Dentist property)
    medicalSpecialty: 'https://schema.org/Dentistry',
    ...(sameAs.length ? { sameAs } : {}),
    ...(reviews.rating && reviews.reviewCount
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: reviews.rating, reviewCount: reviews.reviewCount } }
      : {}),
  };
}

export function physicianJsonLd(d: Doctor, lang: Lang) {
  return {
    '@context': 'https://schema.org',
    // IndividualPhysician: schema.org's type for one doctor (a Physician is a practice); linked by practicesAt.
    '@type': 'IndividualPhysician',
    '@id': `${absoluteUrl(`/doctors/${d.slug}`)}#physician`,
    name: d.displayName,
    url: absoluteUrl(localePath(lang, `/doctors/${d.slug}`)),
    description: tx(d.summary, lang),
    medicalSpecialty: 'https://schema.org/Dentistry',
    knowsAbout: d.expertise,
    hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: d.qualification },
    practicesAt: { '@id': clinicId() },
    telephone: clinic.phone.e164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinic.address.street,
      addressLocality: clinic.address.locality,
      addressRegion: clinic.address.region,
      postalCode: clinic.address.postalCode,
      addressCountry: clinic.address.country,
    },
  };
}

export function faqJsonLd(items: FaqItem[], lang: Lang, vars?: Record<string, string | number>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: tx(f.q, lang, vars),
      acceptedAnswer: { '@type': 'Answer', text: tx(f.a, lang, vars) },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
