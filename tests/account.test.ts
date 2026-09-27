// Patient accounts: error mapping, auth client (refresh/retry/sign-out), patient booking, My appointments.
// fetch is stubbed per test (test-only); nothing here ships.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookingError, parseResponse, AnyBody, type ApiMyAppointment } from '@/lib/booking/api';
import { PatientApi } from '@/lib/account/patientApi';
import type { PatientSession } from '@/lib/account/session';
import { sessionDisplayName } from '@/lib/account/session';
import { canCancel, groupAppointments, timeInZone } from '@/lib/account/appointments';
import { ClinicFlowBookingService } from '@/lib/booking/services';
import type { BookingClientConfig } from '@/lib/booking/config';

const BASE = 'https://api.test/api/v1';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const envelope = (code: string, status: number) => json({ success: false, error: { code, message: code } }, status);
const auth = (role = 'PATIENT', token = 'acc-1', refresh = 'ref-1') =>
  json({ success: true, data: { accessToken: token, refreshToken: refresh, tokenType: 'Bearer', expiresIn: 1_800_000, user: { id: 'u1', email: 'p@x.test', firstName: 'Lakshmi', lastName: 'Prasanna', role } } });

function memoryStore(initial: PatientSession | null = null) {
  let s = initial;
  return { read: () => s, write: (v: PatientSession | null) => void (s = v) };
}
const session = (over: Partial<PatientSession> = {}): PatientSession => ({
  accessToken: 'acc-old',
  refreshToken: 'ref-old',
  expiresAt: Date.now() + 10 * 60_000,
  user: { id: 'u1', email: 'p@x.test', firstName: 'Lakshmi', lastName: 'Prasanna' },
  ...over,
});

type Call = { url: string; method: string; body: unknown; authz: string | null };
function stub(handler: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      const c = { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined, authz: h.get('Authorization') };
      calls.push(c);
      return handler(c);
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('parseResponse error codes (code before HTTP status)', () => {
  it.each([
    ['AUTH_EMAIL_ALREADY_EXISTS', 409, 'emailTaken'],
    ['APPOINTMENT_SLOT_NOT_AVAILABLE', 409, 'slotTaken'],
    ['APPOINTMENT_SLOT_LOCKED', 409, 'slotTaken'],
    ['APPOINTMENT_ALREADY_CANCELLED', 409, 'cannotCancel'],
    ['AUTH_INVALID_CREDENTIALS', 401, 'badCredentials'],
    ['AUTH_ACCOUNT_DISABLED', 403, 'accountDisabled'],
    ['OTP_INVALID', 400, 'otpInvalid'],
    ['RATE_LIMIT_EXCEEDED', 429, 'rateLimit'],
  ])('%s → %s', async (code, status, kind) => {
    await expect(parseResponse(envelope(code, status), AnyBody)).rejects.toMatchObject({ kind });
  });
  it('bare 401 → unauthorized', async () => expect(parseResponse(new Response('', { status: 401 }), AnyBody)).rejects.toMatchObject({ kind: 'unauthorized' }));
});

describe('PatientApi sign-in', () => {
  it('register splits the name, sends 10-digit phone, stores the session', async () => {
    const calls = stub(() => auth());
    const store = memoryStore();
    const api = new PatientApi(BASE, 'suhasini', store);
    const s = await api.register({ fullName: 'Lakshmi Prasanna', phone: '9441411629', email: ' p@x.test ', password: 'secret123' });
    expect(calls[0].url).toBe(`${BASE}/auth/register`);
    expect(calls[0].body).toEqual({ firstName: 'Lakshmi', lastName: 'Prasanna', email: 'p@x.test', phone: '9441411629', password: 'secret123' });
    expect(store.read()).toEqual(s);
    expect(s.expiresAt).toBeGreaterThan(Date.now() + 29 * 60_000); // expiresIn is milliseconds
  });

  it('login is tenant-scoped with the clinic slug', async () => {
    const calls = stub(() => auth());
    await new PatientApi(BASE, 'suhasini', memoryStore()).login('p@x.test', 'pw');
    expect(calls[0].body).toEqual({ email: 'p@x.test', password: 'pw', clinicSlug: 'suhasini' });
  });

  it('refuses staff accounts and stores nothing', async () => {
    stub(() => auth('DOCTOR'));
    const store = memoryStore();
    await expect(new PatientApi(BASE, 'suhasini', store).login('d@x.test', 'pw')).rejects.toMatchObject({ kind: 'notPatient' });
    expect(store.read()).toBeNull();
  });

  it('wrong password → badCredentials, still signed out', async () => {
    stub(() => envelope('AUTH_INVALID_CREDENTIALS', 401));
    const store = memoryStore();
    await expect(new PatientApi(BASE, 'suhasini', store).login('p@x.test', 'bad')).rejects.toMatchObject({ kind: 'badCredentials' });
    expect(store.read()).toBeNull();
  });

  it('forgot-password sends email + clinic slug', async () => {
    const calls = stub(() => json({ success: true, data: null }));
    await new PatientApi(BASE, 'suhasini', memoryStore()).forgotPassword('p@x.test');
    expect(calls[0]).toMatchObject({ url: `${BASE}/auth/forgot-password`, body: { email: 'p@x.test', clinicSlug: 'suhasini' } });
  });
});

describe('PatientApi authenticated calls', () => {
  it('sends the bearer token', async () => {
    const calls = stub(() => json([]));
    await new PatientApi(BASE, 'suhasini', memoryStore(session())).myAppointments();
    expect(calls[0]).toMatchObject({ url: `${BASE}/appointments/my`, method: 'GET', authz: 'Bearer acc-old' });
  });

  it('401 → refresh once → retry with the new token (refresh token rotated)', async () => {
    const calls = stub((c) => {
      if (c.url.endsWith('/auth/refresh')) return auth('PATIENT', 'acc-new', 'ref-new');
      return c.authz === 'Bearer acc-new' ? json([]) : new Response('', { status: 401 });
    });
    const store = memoryStore(session());
    await new PatientApi(BASE, 'suhasini', store).myAppointments();
    expect(calls.map((c) => c.url.replace(BASE, ''))).toEqual(['/appointments/my', '/auth/refresh', '/appointments/my']);
    expect(calls[1].body).toEqual({ refreshToken: 'ref-old' });
    expect(store.read()).toMatchObject({ accessToken: 'acc-new', refreshToken: 'ref-new' });
  });

  it('expired access token is refreshed before the call', async () => {
    const calls = stub((c) => (c.url.endsWith('/auth/refresh') ? auth('PATIENT', 'acc-new', 'ref-new') : json([])));
    await new PatientApi(BASE, 'suhasini', memoryStore(session({ expiresAt: Date.now() - 1 }))).myAppointments();
    expect(calls[0].url).toBe(`${BASE}/auth/refresh`);
    expect(calls[1].authz).toBe('Bearer acc-new');
  });

  it('rejected refresh token → signed out, unauthorized', async () => {
    stub((c) => (c.url.endsWith('/auth/refresh') ? envelope('AUTH_REFRESH_TOKEN_INVALID', 401) : new Response('', { status: 401 })));
    const store = memoryStore(session());
    await expect(new PatientApi(BASE, 'suhasini', store).myAppointments()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(store.read()).toBeNull();
  });

  it('concurrent 401s share one refresh', async () => {
    let refreshes = 0;
    stub((c) => {
      if (c.url.endsWith('/auth/refresh')) {
        refreshes++;
        return auth('PATIENT', 'acc-new', 'ref-new');
      }
      return c.authz === 'Bearer acc-new' ? json([]) : new Response('', { status: 401 });
    });
    const api = new PatientApi(BASE, 'suhasini', memoryStore(session()));
    await Promise.all([api.myAppointments(), api.myAppointments()]);
    expect(refreshes).toBe(1);
  });

  it('cancel sends the reason', async () => {
    const calls = stub(() => json({ id: 'a1', appointmentDate: '2026-10-01', startTime: '17:00:00', status: 'CANCELLED' }));
    const r = await new PatientApi(BASE, 'suhasini', memoryStore(session())).cancel('a1', 'Travelling');
    expect(calls[0]).toMatchObject({ url: `${BASE}/appointments/a1/cancel`, method: 'PUT', body: { reason: 'Travelling' } });
    expect(r.status).toBe('CANCELLED');
  });
});

describe('ClinicFlowBookingService.bookAsPatient (slot lock → book)', () => {
  const CLINIC_ID = '11111111-1111-1111-1111-111111111111';
  const DOC_ID = '22222222-2222-2222-2222-222222222222';
  const BRANCH = '33333333-3333-3333-3333-333333333333';
  const cfg = {
    proxyBase: '/api/clinicflow',
    api: { baseUrl: BASE, clinicSlug: 'suhasini', clinicId: CLINIC_ID },
    doctors: [{ slug: 'dr-suhasini', displayName: 'Dr. Suhasini', firstName: 'Suhasini', lastName: '', clinicflowDoctorId: null, consultation: [] }],
  } as unknown as BookingClientConfig;
  const req = { fullName: 'Lakshmi Prasanna', phone: '', email: 'p@x.test', branchId: BRANCH, treatmentLabel: 'Toothache', doctorSlug: 'dr-suhasini', date: '2026-10-01', time: '17:00' };

  async function service(slotFree = true) {
    const svc = new ClinicFlowBookingService(cfg, CLINIC_ID);
    stub((c) => {
      if (c.url.includes('/branches')) return json([{ id: BRANCH, name: 'Main' }]);
      if (c.url.endsWith('/doctors')) return json([{ id: DOC_ID, firstName: 'Suhasini', lastName: 'MDS', isActive: true }]);
      throw new Error(c.url);
    });
    await svc.load();
    return { svc, slotFree };
  }

  it('re-checks the slot, locks it, books with the lockId, no OTP', async () => {
    const { svc } = await service();
    const calls = stub((c) => {
      if (c.url.includes('/slots?')) return json([{ startTime: '17:00:00', endTime: '17:30:00', available: true }]);
      if (c.url.endsWith('/slots/lock')) return json({ lockId: 'L1', expiresAt: null, secondsRemaining: 180 });
      if (c.url.endsWith('/appointments')) return json({ id: 'A1', doctorName: 'Dr. Suhasini MDS', appointmentDate: '2026-10-01', startTime: '17:00:00', endTime: '17:30:00', status: 'CONFIRMED' });
      throw new Error(c.url);
    });
    const api = new PatientApi(BASE, 'suhasini', memoryStore(session()));
    const r = await svc.bookAsPatient(req, api);
    expect(r).toMatchObject({ kind: 'booked', appointmentId: 'A1', status: 'CONFIRMED', time: '17:00', endTime: '17:30' });
    expect(calls[0].url).toContain('fresh=1');
    expect(calls[1]).toMatchObject({ url: `${BASE}/clinics/${CLINIC_ID}/doctors/${DOC_ID}/slots/lock`, body: { branchId: BRANCH, date: '2026-10-01', startTime: '17:00:00' }, authz: 'Bearer acc-old' });
    expect(calls[2]).toMatchObject({ url: `${BASE}/appointments`, body: { lockId: 'L1', bookingSource: 'WEB', notes: 'Website booking — Toothache' } });
    expect(calls.some((c) => c.url.includes('/otp/'))).toBe(false);
  });

  it('slot gone before locking → slotTaken, nothing locked', async () => {
    const { svc } = await service();
    const calls = stub(() => json([{ startTime: '17:30:00', endTime: '18:00:00', available: true }]));
    await expect(svc.bookAsPatient(req, new PatientApi(BASE, 'suhasini', memoryStore(session())))).rejects.toMatchObject({ kind: 'slotTaken' });
    expect(calls).toHaveLength(1);
  });

  it('booking fails after locking → lock released, error surfaced', async () => {
    const { svc } = await service();
    const calls = stub((c) => {
      if (c.url.includes('/slots?')) return json([{ startTime: '17:00:00', endTime: '17:30:00', available: true }]);
      if (c.url.endsWith('/slots/lock')) return json({ lockId: 'L1' });
      if (c.url.endsWith('/appointments')) return envelope('APPOINTMENT_SLOT_NOT_AVAILABLE', 409);
      if (c.method === 'DELETE') return new Response(null, { status: 204 });
      throw new Error(c.url);
    });
    await expect(svc.bookAsPatient(req, new PatientApi(BASE, 'suhasini', memoryStore(session())))).rejects.toBeInstanceOf(BookingError);
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', url: `${BASE}/clinics/${CLINIC_ID}/doctors/${DOC_ID}/slots/lock/L1` });
  });
});

describe('My appointments grouping', () => {
  const appt = (id: string, date: string, time: string, status = 'CONFIRMED', clinicId: string | null = 'c1'): ApiMyAppointment => ({ id, appointmentDate: date, startTime: `${time}:00`, status, clinicId });
  const list = [
    appt('past', '2026-09-20', '17:00'),
    appt('later-today', '2026-09-27', '19:00'),
    appt('earlier-today', '2026-09-27', '10:00'),
    appt('future', '2026-10-02', '17:00'),
    appt('cancelled-future', '2026-10-03', '17:00', 'CANCELLED'),
    appt('other-clinic', '2026-10-01', '17:00', 'CONFIRMED', 'c2'),
  ];

  it('upcoming soonest first; past + cancelled latest first; only this clinic', () => {
    const g = groupAppointments(list, 'c1', '2026-09-27', '12:00');
    expect(g.upcoming.map((a) => a.id)).toEqual(['later-today', 'future']);
    expect(g.past.map((a) => a.id)).toEqual(['cancelled-future', 'earlier-today', 'past']);
  });

  it('unknown clinic id keeps everything', () => expect(groupAppointments(list, null, '2026-09-27', '12:00').upcoming).toHaveLength(3));
  it('cancellable statuses', () => {
    expect(canCancel(appt('a', '2026-10-01', '17:00', 'CONFIRMED'))).toBe(true);
    expect(canCancel(appt('a', '2026-10-01', '17:00', 'PENDING_PAYMENT'))).toBe(true);
    expect(canCancel(appt('a', '2026-10-01', '17:00', 'COMPLETED'))).toBe(false);
  });
  it('clock in the clinic zone', () => expect(timeInZone('Asia/Kolkata', new Date('2026-09-27T06:30:00Z'))).toBe('12:00'));
  it('display name drops the "." placeholder last name', () => expect(sessionDisplayName(session({ user: { id: 'u', email: 'e', firstName: 'Lakshmi', lastName: '.' } }))).toBe('Lakshmi'));
});
