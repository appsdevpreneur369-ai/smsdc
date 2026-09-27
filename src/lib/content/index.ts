/**
 * Typed, validated access to everything in /content.
 * Nothing user-visible is hard-coded in components: it all comes through here.
 * A validation error fails `next build` with a message naming the file and field.
 */
import { z } from 'zod';
import clinicJson from '@content/clinic.json';
import brandJson from '@content/brand.json';
import imagesJson from '@content/images.json';
import doctorsJson from '@content/doctors.json';
import servicesJson from '@content/services.json';
import routingJson from '@content/routing.json';
import bookingJson from '@content/booking.json';
import homeJson from '@content/home.json';
import whyUsJson from '@content/why-us.json';
import faqsJson from '@content/faqs.json';
import reviewsJson from '@content/reviews.json';
import galleryJson from '@content/gallery.json';
import emergencyJson from '@content/emergency.json';
import pagesJson from '@content/pages.json';
import navigationJson from '@content/navigation.json';
import {
  BookingSchema,
  BrandSchema,
  ClinicSchema,
  DoctorsSchema,
  EmergencySchema,
  FaqsSchema,
  GallerySchema,
  HomeSchema,
  ImagesSchema,
  NavigationSchema,
  PagesSchema,
  ReviewsSchema,
  RoutingSchema,
  ServicesSchema,
  WhyUsSchema,
  type Category,
  type Doctor,
  type ImageEntry,
} from './schemas';

function load<T extends z.ZodTypeAny>(file: string, schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid content in content/${file}:\n${issues}`);
  }
  return result.data;
}

export const clinic = load('clinic.json', ClinicSchema, clinicJson);
export const brand = load('brand.json', BrandSchema, brandJson);
export const images = load('images.json', ImagesSchema, imagesJson).images;
export const doctorsFile = load('doctors.json', DoctorsSchema, doctorsJson);
export const doctors = doctorsFile.doctors;
export const services = load('services.json', ServicesSchema, servicesJson);
export const categories = services.categories;
export const routing = load('routing.json', RoutingSchema, routingJson);
export const booking = load('booking.json', BookingSchema, bookingJson);
export const home = load('home.json', HomeSchema, homeJson);
export const whyUs = load('why-us.json', WhyUsSchema, whyUsJson);
export const faqs = load('faqs.json', FaqsSchema, faqsJson);
export const reviews = load('reviews.json', ReviewsSchema, reviewsJson);
export const gallery = load('gallery.json', GallerySchema, galleryJson);
export const emergency = load('emergency.json', EmergencySchema, emergencyJson);
export const pages = load('pages.json', PagesSchema, pagesJson);
export const navigation = load('navigation.json', NavigationSchema, navigationJson);

// ── Cross-file reference checks ─────────────────────────────────────────────
const doctorSlugs = new Set(doctors.map((d) => d.slug));
const categorySlugs = new Set(categories.map((c) => c.slug));
const refErrors: string[] = [];
const needDoctor = (slug: string, where: string) => {
  if (!doctorSlugs.has(slug)) refErrors.push(`${where}: unknown doctor "${slug}" (see doctors.json)`);
};
const needImage = (id: string | null | undefined, where: string) => {
  if (id && !images[id]) refErrors.push(`${where}: unknown image id "${id}" (see images.json)`);
};
needDoctor(clinic.clinicHead, 'clinic.json clinicHead');
needDoctor(booking.defaultDoctor, 'booking.json defaultDoctor');
booking.generalOption.doctors.forEach((d) => needDoctor(d, 'booking.json generalOption'));
categories.forEach((c) => {
  c.doctors.forEach((d) => needDoctor(d, `services.json ${c.slug}`));
  c.subTreatments.forEach((s) => s.doctors?.forEach((d) => needDoctor(d, `services.json ${c.slug}/${s.slug}`)));
  needImage(c.image, `services.json ${c.slug}`);
});
routing.problems.forEach((p) => {
  p.doctors.forEach((d) => needDoctor(d, `routing.json ${p.id}`));
  if (!categorySlugs.has(p.service)) refErrors.push(`routing.json ${p.id}: unknown service "${p.service}"`);
});
doctors.forEach((d) => needImage(d.avatar.image, `doctors.json ${d.slug}`));
needImage(home.hero.image, 'home.json hero');
needImage(home.about.image, 'home.json about');
gallery.items.forEach((g, i) => needImage(g.image, `gallery.json item ${i}`));
Object.values(brand.logo).forEach((id) => needImage(id, 'brand.json logo'));
if (refErrors.length) throw new Error(`Content cross-reference errors:\n  • ${refErrors.join('\n  • ')}`);

// ── Lookups ────────────────────────────────────────────────────────────────
export function getImage(id: string): ImageEntry {
  const img = images[id];
  if (!img) throw new Error(`Unknown image id "${id}"`);
  return img;
}
export function getDoctor(slug: string): Doctor {
  const d = doctors.find((x) => x.slug === slug);
  if (!d) throw new Error(`Unknown doctor "${slug}"`);
  return d;
}
export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
export const clinicHead = getDoctor(clinic.clinicHead);

/** Categories a doctor is responsible for (category-level or any sub-treatment). */
export function categoriesForDoctor(slug: string): Category[] {
  return categories.filter((c) => c.doctors.includes(slug) || c.subTreatments.some((s) => s.doctors?.includes(slug)));
}

export const showPlaceholderBadges = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES === 'true';

/** 'staging' | 'production' (default). Staging is never indexed. */
export const siteEnv = process.env.NEXT_PUBLIC_SITE_ENV === 'staging' ? 'staging' : 'production';
export const noIndex = siteEnv === 'staging' || process.env.NEXT_PUBLIC_NOINDEX === 'true';

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || clinic.siteUrl).replace(/\/$/, '');
