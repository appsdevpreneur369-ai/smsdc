import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidEmail, isValidFullName, maskIndianMobile, normalizeIndianMobile, splitFullName } from '@/lib/booking/validation';
import { barePath, canAutoOpen, isExcludedPath, type PopupConfig } from '@/lib/booking/popupRules';
import { selectMode, fallbackOrder } from '@/lib/booking/selectMode';
import { buildTreatmentGroups, doctorsForOption, findOption, resolvePrefill, type TreatmentSource } from '@/lib/booking/treatments';
import { addDays, availableDates, weekdayOf } from '@/lib/booking/dates';
import { buildIcs } from '@/lib/booking/ics';
import { mapDoctor, resolveBookingService } from '@/lib/booking/services';
import type { BookingClientConfig } from '@/lib/booking/config';
import routing from '@content/routing.json';
import services from '@content/services.json';
import booking from '@content/booking.json';

// ── Phone / email / name ─────────────────────────────────────────────────────
describe('normalizeIndianMobile', () => {
  it.each([
    ['9441411629', '9441411629'],
    ['+91 94414 11629', '9441411629'],
    ['+919441411629', '9441411629'],
    ['919441411629', '9441411629'],
    ['09441411629', '9441411629'],
    ['94414-11629', '9441411629'],
    ['6000000000', '6000000000'],
  ])('accepts %s', (input, out) => expect(normalizeIndianMobile(input)).toBe(out));

  it.each(['5441411629', '944141162', '94414116299', '+1 9441411629', '', 'abcdefghij', '0094414116'])('rejects %s', (input) =>
    expect(normalizeIndianMobile(input)).toBeNull(),
  );

  it('masks all but the last four digits', () => expect(maskIndianMobile('9441411629')).toBe('+91 XXXXX X1629'));
});

describe('isValidEmail', () => {
  it.each(['a@b.co', 'dr.suhasini.mds@gmail.com', 'name+tag@clinic.in'])('accepts %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'a@b', 'a@b.c', 'a b@c.com', 'a@@b.com', 'a@b..com', '@b.com'])('rejects %s', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('names', () => {
  it('validates full names', () => {
    expect(isValidFullName('Lakshmi')).toBe(true);
    expect(isValidFullName('ల')).toBe(false);
    expect(isValidFullName('లక్ష్మి')).toBe(true);
    expect(isValidFullName('  ')).toBe(false);
  });
  it('splits into first/last for the API (one-word names get ".")', () => {
    expect(splitFullName('Lakshmi Prasanna Reddy')).toEqual({ firstName: 'Lakshmi Prasanna', lastName: 'Reddy' });
    expect(splitFullName('Lakshmi')).toEqual({ firstName: 'Lakshmi', lastName: '.' });
  });
});

// ── Popup trigger rules ──────────────────────────────────────────────────────
const popup: PopupConfig = { enabled: true, delaySeconds: 8, oncePerSession: true, showOnMobile: true, excludedPaths: ['/book', '/privacy', '/terms', '/disclaimer', '/cookies'] };
const base = { config: popup, pathname: '/', isMobile: false, sessionState: null, shownThisPage: false } as const;

describe('popup rules', () => {
  it('opens on a normal page in a fresh session', () => expect(canAutoOpen(base)).toBe(true));
  it('respects enabled=false', () => expect(canAutoOpen({ ...base, config: { ...popup, enabled: false } })).toBe(false));
  it.each(['/book', '/te/book', '/privacy', '/te/terms', '/disclaimer/', '/cookies'])('never on excluded path %s', (p) =>
    expect(canAutoOpen({ ...base, pathname: p })).toBe(false),
  );
  it('does not treat /bookings or /books as /book', () => {
    expect(isExcludedPath('/bookings', popup.excludedPaths)).toBe(false);
    expect(barePath('/te/services/')).toBe('/services');
  });
  it.each(['closed', 'opened', 'booked'] as const)('never again in the session after "%s"', (st) =>
    expect(canAutoOpen({ ...base, sessionState: st })).toBe(false),
  );
  it('not twice on the same page', () => expect(canAutoOpen({ ...base, shownThisPage: true })).toBe(false));
  it('mobile follows showOnMobile', () => {
    expect(canAutoOpen({ ...base, isMobile: true })).toBe(true);
    expect(canAutoOpen({ ...base, isMobile: true, config: { ...popup, showOnMobile: false } })).toBe(false);
  });
  it('without oncePerSession it may reopen on another page, but never after booking', () => {
    const cfg = { ...popup, oncePerSession: false };
    expect(canAutoOpen({ ...base, config: cfg, sessionState: 'closed' })).toBe(true);
    expect(canAutoOpen({ ...base, config: cfg, sessionState: 'booked' })).toBe(false);
  });
  it('content config matches the brief', () => {
    expect(booking.popup).toMatchObject({ enabled: true, delaySeconds: 8, oncePerSession: true, showOnMobile: true });
    expect(booking.popup.excludedPaths).toEqual(['/book', '/account', '/privacy', '/terms', '/disclaimer', '/cookies']);
  });
});

// ── Treatment → doctor mapping (from real content) ───────────────────────────
const source = (allowDirect = true): TreatmentSource => ({
  generalGroupLabel: 'Not sure',
  generalOption: { label: 'Not sure – general check-up', doctors: booking.generalOption.doctors },
  problems: routing.problems.map((p) => ({ id: p.id, label: p.label.en, doctors: p.doctors })),
  categories: services.categories.map((c) => ({
    slug: c.slug,
    title: c.title.en,
    doctors: c.doctors,
    subTreatments: c.subTreatments.map((s) => ({ slug: s.slug, title: s.title.en, doctors: (s as { doctors?: string[] }).doctors })),
  })),
  allowDirectSpecialistBooking: allowDirect,
  defaultDoctor: 'dr-suhasini',
});

describe('treatment → doctor mapping', () => {
  const groups = buildTreatmentGroups(source());
  it('has the general group + 9 categories', () => {
    expect(groups).toHaveLength(10);
    expect(groups[0].options[0]).toMatchObject({ id: 'general', doctors: ['dr-suhasini'] });
  });
  it('maps routing problems (oral surgery → both surgeons)', () => {
    expect(findOption(groups, 'problem:wisdom-jaw')?.doctors).toEqual(['dr-varun-krishna', 'dr-preethi']);
    expect(findOption(groups, 'problem:gums')?.doctors).toEqual(['dr-sindhu']);
  });
  it('uses sub-treatment overrides (crown after RCT → Dr. Phani, gum contouring → Dr. Sindhu)', () => {
    expect(findOption(groups, 'treatment:root-canal-treatment/crown-after-root-canal')?.doctors).toEqual(['dr-phani']);
    expect(findOption(groups, 'treatment:cosmetic-dentistry/gum-contouring')?.doctors).toEqual(['dr-sindhu']);
    expect(findOption(groups, 'treatment:dental-implants/bone-grafting-sinus-lift')?.doctors).toEqual(['dr-varun-krishna', 'dr-preethi']);
  });
  it('a preferred doctor narrows a multi-doctor option only if that doctor treats it', () => {
    const o = findOption(groups, 'problem:wisdom-jaw');
    expect(doctorsForOption(o, 'dr-preethi')).toEqual(['dr-preethi']);
    expect(doctorsForOption(o, 'dr-phani')).toEqual(['dr-varun-krishna', 'dr-preethi']);
  });
  it('allowDirectSpecialistBooking=false routes everything to Dr. Suhasini', () => {
    const g = buildTreatmentGroups(source(false));
    expect(g.flatMap((x) => x.options).every((o) => o.doctors.join() === 'dr-suhasini')).toBe(true);
  });
  it('resolves deep-link prefills', () => {
    expect(resolvePrefill(groups, { problem: 'gums' }).treatmentId).toBe('problem:gums');
    expect(resolvePrefill(groups, { treatment: 'dental-implants' }).treatmentId).toBe('treatment:dental-implants/single-tooth-implant');
    expect(resolvePrefill(groups, { treatment: 'oral-surgery', doctor: 'dr-preethi' })).toEqual({ treatmentId: 'treatment:oral-surgery/wisdom-tooth-removal', preferredDoctor: 'dr-preethi' });
    expect(resolvePrefill(groups, { doctor: 'dr-praveen' }).treatmentId).toMatch(/^(problem:alignment|treatment:orthodontics\/)/);
    expect(resolvePrefill(groups, {})).toEqual({ treatmentId: null, preferredDoctor: null });
  });
});

// ── Dates ────────────────────────────────────────────────────────────────────
describe('available dates', () => {
  it('skips days the doctors do not consult (e.g. Sundays)', () => {
    const weekdays = [{ days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const, opens: '17:00', closes: '20:00' }];
    const list = availableDates([weekdays.map((w) => ({ ...w, days: [...w.days] }))], '2026-09-27', 7); // 27 Sep 2026 = Sunday
    expect(weekdayOf('2026-09-27')).toBe('sunday');
    expect(list).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });
});

// ── Mode fallback ────────────────────────────────────────────────────────────
describe('selectMode', () => {
  it('orders clinicflow → enquiry → whatsapp', () => expect(fallbackOrder('clinicflow')).toEqual(['clinicflow', 'enquiry', 'whatsapp']));
  it('keeps clinicflow when healthy', () => expect(selectMode('clinicflow', { clinicflow: { ok: true }, enquiry: { ok: true } }).mode).toBe('clinicflow'));
  it('falls back to enquiry', () => {
    const r = selectMode('clinicflow', { clinicflow: { ok: false, reason: 'no branches' }, enquiry: { ok: true } });
    expect(r).toEqual({ mode: 'enquiry', reasons: ['clinicflow unavailable: no branches'] });
  });
  it('falls back to whatsapp with reasons', () => {
    const r = selectMode('clinicflow', { clinicflow: { ok: false, reason: 'CORS' }, enquiry: { ok: false, reason: 'CORS' } });
    expect(r.mode).toBe('whatsapp');
    expect(r.reasons).toHaveLength(2);
  });
  it('whatsapp preferred never touches the network', () => expect(selectMode('whatsapp', {}).mode).toBe('whatsapp'));
});

// ── Health check + fallback against a stubbed fetch (test-only mock) ─────────
const cfg = (preferredMode: BookingClientConfig['preferredMode'] = 'clinicflow'): BookingClientConfig =>
  ({
    lang: 'en',
    preferredMode,
    api: { baseUrl: 'https://api.test/api/v1', clinicSlug: 'suhasini', clinicId: '' },
    proxyBase: '/api/clinicflow',
    advanceDays: 30,
    otpResendSeconds: 30,
    timezone: 'Asia/Kolkata',
    treatments: [],
    doctors: [
      { slug: 'dr-suhasini', displayName: 'Dr. Suhasini', firstName: 'Suhasini', lastName: '', clinicflowDoctorId: null, consultation: [] },
      { slug: 'dr-naveen-kumar', displayName: 'Dr. Naveen Kumar', firstName: 'Naveen', lastName: 'Kumar', clinicflowDoctorId: null, consultation: [] },
    ],
    clinic: { name: 'Clinic', shortName: 'Clinic', branchName: 'Main', address: 'Addr', mapsUrl: 'https://maps', whatsappDigits: '919441411629', phoneDisplay: '+91', telHref: 'tel:+91' },
    popup,
    consentText: '',
    privacyHref: '/privacy',
    whatsappTemplate: '{{name}}',
    enquiryTemplate: '{{problem}}',
    note: '',
    strings: { anyTime: 'Any time' },
    accountStrings: {},
    accountHref: '/account',
    otpHint: '',
    dayNames: {},
  }) as BookingClientConfig;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const CLINIC = { id: '11111111-1111-1111-1111-111111111111', slug: 'suhasini', name: 'Suhasini' };

function stubFetch(routes: { proxyClinic?: Response | 'fail'; direct?: Response | 'fail'; branches?: unknown; doctors?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/clinicflow/clinics/public/suhasini/branches')) return json(routes.branches ?? []);
      if (url.startsWith('/api/clinicflow/clinics/public/suhasini')) {
        if (routes.proxyClinic === 'fail') throw new TypeError('fetch failed');
        return routes.proxyClinic ?? json(CLINIC);
      }
      if (url.startsWith('/api/clinicflow/clinics/') && url.endsWith('/doctors')) return json(routes.doctors ?? []);
      if (url.startsWith('https://api.test/api/v1/clinics/public/suhasini')) {
        if (routes.direct === 'fail') throw new TypeError('Failed to fetch'); // what a CORS block looks like
        return routes.direct ?? json(CLINIC);
      }
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
}

describe('resolveBookingService (fallback, never a fake success)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const quiet = () => vi.spyOn(console, 'info').mockImplementation(() => {});

  it('clinic not found on ClinicFlow → whatsapp', async () => {
    quiet();
    stubFetch({ proxyClinic: json({ success: false, error: { code: 'CLINIC_NOT_FOUND' } }, 404) });
    const r = await resolveBookingService(cfg());
    expect(r.mode).toBe('whatsapp');
    expect(r.reasons.join()).toMatch(/not found/);
  });
  it('CORS blocked → whatsapp', async () => {
    quiet();
    stubFetch({ direct: 'fail' });
    const r = await resolveBookingService(cfg());
    expect(r.mode).toBe('whatsapp');
    expect(r.reasons.join()).toMatch(/CORS/);
  });
  it('API down → whatsapp', async () => {
    quiet();
    stubFetch({ proxyClinic: 'fail' });
    expect((await resolveBookingService(cfg())).mode).toBe('whatsapp');
  });
  it('clinic + CORS ok but no branches → enquiry', async () => {
    quiet();
    stubFetch({ branches: [] });
    expect((await resolveBookingService(cfg())).mode).toBe('enquiry');
  });
  it('all healthy → clinicflow, doctors matched by name', async () => {
    stubFetch({
      branches: [{ id: 'b1', name: 'Main', slug: 'main', city: 'Tadepalle' }],
      doctors: [
        { id: 'd1', firstName: 'Suhasini', lastName: 'MDS', fullName: 'Dr. Suhasini MDS', isActive: true },
        { id: 'd2', firstName: 'Naveen', lastName: 'Kumar', fullName: 'Dr. Naveen Kumar', isActive: true },
      ],
    });
    const r = await resolveBookingService(cfg());
    expect(r.mode).toBe('clinicflow');
    expect(r.service.requiresOtp).toBe(true);
    expect(await r.service.getBranches()).toEqual([{ id: 'b1', name: 'Main', address: 'Tadepalle' }]);
  });
  it('whatsapp preferred makes no network calls', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const r = await resolveBookingService(cfg('whatsapp'));
    expect(r.mode).toBe('whatsapp');
    expect(f).not.toHaveBeenCalled();
    const res = await r.service.submitEnquiry({ fullName: 'Lakshmi', phone: '9441411629', email: 'a@b.co', branchId: 'content', treatmentLabel: 'Check-up', doctorSlug: 'dr-suhasini', date: '2026-09-28', time: '' });
    expect(res.kind).toBe('whatsapp');
    expect(res.kind === 'whatsapp' && res.href).toContain('https://wa.me/919441411629?text=Lakshmi');
  });
});

describe('mapDoctor', () => {
  const api = [
    { id: 'a', firstName: 'Varun', lastName: 'Krishna' },
    { id: 'b', firstName: 'Preethi', lastName: 'MDS' },
  ];
  it('prefers an explicit clinicflowDoctorId', () =>
    expect(mapDoctor({ slug: 'x', displayName: '', firstName: 'Varun', lastName: 'Krishna', clinicflowDoctorId: 'b', consultation: [] }, api)?.id).toBe('b'));
  it('matches first + last name, ignoring "Dr." and case', () =>
    expect(mapDoctor({ slug: 'x', displayName: '', firstName: 'varun', lastName: 'krishna', clinicflowDoctorId: null, consultation: [] }, api)?.id).toBe('a'));
  it('matches first name only when the site has no last name', () =>
    expect(mapDoctor({ slug: 'x', displayName: '', firstName: 'Preethi', lastName: '', clinicflowDoctorId: null, consultation: [] }, api)?.id).toBe('b'));
});

describe('ics', () => {
  it('writes IST times as UTC', () => {
    const ics = buildIcs({ uid: 'u1', title: 'Visit, Dr. X', description: 'd', location: 'Road; Town', date: '2026-09-28', start: '17:00', end: '17:30' });
    expect(ics).toContain('DTSTART:20260928T113000Z');
    expect(ics).toContain('DTEND:20260928T120000Z');
    expect(ics).toContain('SUMMARY:Visit\\, Dr. X');
    expect(ics).toContain('LOCATION:Road\\; Town');
  });
});
