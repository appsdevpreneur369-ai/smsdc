import { z } from 'zod';

/** Every content record carries a review status. */
export const Status = z.enum(['placeholder', 'approved']);
export type Status = z.infer<typeof Status>;

/** A string in English, optionally with a Telugu version. Plain strings are English-only. */
export const Loc = z.union([z.string(), z.object({ en: z.string(), te: z.string().optional() })]);
export type Loc = z.infer<typeof Loc>;

const Time = z.string().regex(/^\d{2}:\d{2}$/, 'Use 24-hour HH:MM');
export const Day = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type Day = z.infer<typeof Day>;
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #087F8C');
const Slug = z.string().regex(/^[a-z0-9-]+$/);
/** Site path ('/book') or an action token ('@call', '@whatsapp'). */
const Href = z.string().regex(/^(\/|@call$|@whatsapp$|https?:\/\/)/);

export const Link = z.object({ label: Loc, href: Href });

export const ClinicSchema = z.object({
  status: Status,
  slug: Slug,
  siteUrl: z.string().url(),
  officialName: z.string(),
  displayName: Loc,
  shortName: Loc,
  tagline: Loc,
  description: Loc,
  clinicHead: Slug,
  phone: z.object({ display: z.string(), e164: z.string().regex(/^\+\d{8,15}$/) }),
  whatsapp: z.object({ display: z.string(), e164: z.string().regex(/^\+\d{8,15}$/) }),
  email: z.string().email(),
  address: z.object({
    street: z.string(),
    locality: z.string(),
    region: z.string(),
    postalCode: z.string(),
    country: z.string().length(2),
    countryName: z.string(),
  }),
  geo: z.object({ status: Status, lat: z.number(), lng: z.number() }),
  maps: z.object({ shareUrl: z.string().url(), embedUrl: z.string(), embedQuery: z.string() }),
  chairs: z.number().int().positive(),
  timezone: z.string(),
  hours: z
    .array(z.object({ day: Day, sessions: z.array(z.object({ opens: Time, closes: Time })) }))
    .length(7),
  hoursNote: Loc.optional(),
  serviceAreas: z.object({ status: Status, primary: z.string(), nearby: z.array(z.string()) }),
  /** Empty string = shown as a non-clickable icon; a URL makes it a link. Keys match walkwell.json socialLinks. */
  socialLinks: z.object({
    instagram: z.union([z.literal(''), z.string().url()]),
    youtube: z.union([z.literal(''), z.string().url()]),
    twitter: z.union([z.literal(''), z.string().url()]),
    linkedin: z.union([z.literal(''), z.string().url()]),
    facebook: z.union([z.literal(''), z.string().url()]),
  }),
  languages: z.array(z.string()),
});

export const BrandSchema = z.object({
  status: Status,
  colors: z.object({
    primary: Hex,
    primaryHover: Hex,
    primaryDark: Hex,
    secondary: Hex,
    secondarySoft: Hex,
    accent: Hex,
    accentText: Hex,
    background: Hex,
    surface: Hex,
    text: Hex,
    textSecondary: Hex,
    border: Hex,
    dark: Hex,
    darkSoft: Hex,
    onDark: Hex,
    onDarkMuted: Hex,
    success: Hex,
    danger: Hex,
    whatsapp: Hex,
    whatsappHover: Hex,
  }),
  fonts: z.object({ heading: z.string(), body: z.string(), logo: z.string() }),
  logo: z.object({ icon: z.string(), iconWhite: z.string(), appIcon: z.string() }),
  radius: z.string(),
  wordmark: z.object({ primary: z.string(), secondary: z.string() }),
});

export const ImageSchema = z.object({
  status: Status,
  src: z.string().startsWith('/'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: Loc,
  source: z.string(),
  licence: z.string(),
});
export const ImagesSchema = z.object({ images: z.record(z.string(), ImageSchema) });

export const Tone = z.enum(['primary', 'secondary', 'accent', 'dark']);
export const DoctorSchema = z.object({
  slug: Slug,
  status: Status,
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  initials: z.string().min(1).max(3),
  qualification: z.string(),
  speciality: Loc,
  shortSpeciality: Loc,
  role: z.enum(['head', 'consultant']),
  experience: Loc.optional(),
  summary: Loc,
  bio: z.object({ en: z.array(z.string()), te: z.array(z.string()).optional() }),
  expertise: z.array(z.string()),
  consultation: z.array(z.object({ days: z.array(Day), opens: Time, closes: Time })),
  avatar: z.object({ image: z.string().nullable(), tone: Tone }),
  registrationNumber: z.string().nullable(),
  clinicflowDoctorId: z.string().nullable(),
  verify: z.array(z.string()).default([]),
});
export const DoctorsSchema = z.object({ consultSlotMinutes: z.number(), doctors: z.array(DoctorSchema) });

export const Faq = z.object({ q: Loc, a: Loc, home: z.boolean().optional() });

export const SubTreatment = z.object({
  slug: Slug,
  title: Loc,
  description: Loc,
  whoFor: Loc,
  sittings: Loc,
  doctors: z.array(Slug).optional(),
});
export const CategorySchema = z.object({
  slug: Slug,
  status: Status,
  title: Loc,
  bannerName: z.string(),
  icon: z.string(),
  image: z.string(),
  summary: Loc,
  intro: Loc,
  doctors: z.array(Slug).min(1),
  subTreatments: z.array(SubTreatment).min(1),
  faqs: z.array(Faq),
});
export const ServicesSchema = z.object({ pricingNote: Loc, categories: z.array(CategorySchema) });

export const RoutingSchema = z.object({
  status: Status,
  problems: z.array(
    z.object({
      id: Slug,
      icon: z.string(),
      label: Loc,
      hint: Loc,
      doctors: z.array(Slug).min(1),
      mode: z.enum(['any', 'all']).optional(),
      service: Slug,
    }),
  ),
});

export const BookingSchema = z.object({
  status: Status,
  mode: z.enum(['clinicflow', 'whatsapp']),
  clinicflowBookingUrl: z.string(),
  clinicflowDoctorParam: z.string().nullable(),
  allowDirectSpecialistBooking: z.boolean().default(true),
  defaultDoctor: Slug,
  whatsappMessage: Loc,
  generalWhatsappMessage: Loc,
  note: Loc,
});

const Section = z.object({ eyebrow: Loc, heading: Loc, intro: Loc.optional() });
export const HomeSchema = z.object({
  status: Status,
  hero: z.object({
    badge: Loc,
    headlineLine1: Loc,
    headlineLine2: Loc,
    text: Loc,
    primaryCta: Link,
    secondaryCta: Link,
    trustTicks: z.array(Loc),
    image: z.string(),
    chips: z.array(z.object({ icon: z.string(), label: Loc })),
  }),
  trustStrip: z.array(z.object({ icon: z.string(), title: Loc, text: Loc })),
  about: z.object({
    eyebrow: Loc,
    heading: Loc,
    paragraphs: z.array(Loc),
    bullets: z.array(Loc),
    image: z.string(),
    cta: Link,
  }),
  sections: z.object({
    services: Section,
    problemPicker: Section,
    doctors: Section,
    whyUs: Section,
    process: Section,
    education: Section,
    reviews: Section,
    faq: Section,
    contact: Section,
  }),
  ctaBanner: z.object({ heading: Loc, text: Loc, primary: Link, secondary: Link }),
});

const IconCard = z.object({ icon: z.string(), title: Loc, text: Loc });
export const WhyUsSchema = z.object({ status: Status, reasons: z.array(IconCard), steps: z.array(IconCard) });

export const FaqsSchema = z.object({ status: Status, faqs: z.array(Faq) });

export const ReviewsSchema = z.object({
  status: Status,
  googleMapsUrl: z.string().url(),
  writeReviewUrl: z.string(),
  placeId: z.string(),
  liveReviewsEnabled: z.boolean(),
  rating: z.number().min(1).max(5).nullable(),
  reviewCount: z.number().int().nullable(),
  card: z.object({ heading: Loc, text: Loc, readCta: Loc, writeCta: Loc }),
});

export const GallerySchema = z.object({
  status: Status,
  items: z.array(z.object({ image: z.string().nullable(), caption: Loc, category: z.string() })),
});

export const EmergencySchema = z.object({
  status: Status,
  urgentWarning: Loc,
  duringHours: Loc,
  afterHours: Loc,
  situations: z.array(z.object({ id: Slug, icon: z.string(), title: Loc, steps: z.array(Loc) })),
});

const PageMeta = z.object({
  title: Loc,
  description: Loc.optional(),
  eyebrow: Loc.optional(),
  heading: Loc.optional(),
  intro: Loc.optional(),
});
export const PagesSchema = z.object({
  status: Status,
  home: PageMeta,
  about: PageMeta.extend({ story: z.array(Loc), values: z.array(IconCard) }),
  doctors: PageMeta,
  services: PageMeta,
  whyUs: PageMeta,
  gallery: PageMeta,
  reviews: PageMeta,
  education: PageMeta,
  faqs: PageMeta,
  book: PageMeta,
  contact: PageMeta,
  emergency: PageMeta,
  notFound: PageMeta,
});
export type PageKey = Exclude<keyof z.infer<typeof PagesSchema>, 'status'>;

const NavItem = z.object({ key: z.string(), href: z.string().startsWith('/') });
export const NavigationSchema = z.object({
  status: Status,
  topBarMessage: z.string(),
  header: z.array(NavItem),
  headerCta: NavItem,
  footerQuickLinks: z.array(NavItem),
  footerLegal: z.array(NavItem),
});

export const ArticleFrontmatter = z.object({
  slug: Slug,
  status: Status,
  order: z.number(),
  title: z.string(),
  title_te: z.string().optional(),
  summary: z.string(),
  icon: z.string(),
  image: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewStatus: z.enum(['pending', 'reviewed']).optional(),
  relatedService: Slug.optional(),
});

export const LegalFrontmatter = z.object({
  slug: Slug,
  status: Status,
  title: z.string(),
  description: z.string(),
  lastUpdated: z.union([z.string(), z.date()]).transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
});

export type Clinic = z.infer<typeof ClinicSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type ImageEntry = z.infer<typeof ImageSchema>;
export type Doctor = z.infer<typeof DoctorSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type SubTreatment = z.infer<typeof SubTreatment>;
export type FaqItem = z.infer<typeof Faq>;
export type Routing = z.infer<typeof RoutingSchema>;
export type Problem = Routing['problems'][number];
export type Booking = z.infer<typeof BookingSchema>;
export type Home = z.infer<typeof HomeSchema>;
export type WhyUs = z.infer<typeof WhyUsSchema>;
export type Reviews = z.infer<typeof ReviewsSchema>;
export type Gallery = z.infer<typeof GallerySchema>;
export type Emergency = z.infer<typeof EmergencySchema>;
export type Pages = z.infer<typeof PagesSchema>;
export type Navigation = z.infer<typeof NavigationSchema>;
export type LinkT = z.infer<typeof Link>;
