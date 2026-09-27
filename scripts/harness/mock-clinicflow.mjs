// TEST-ONLY mock of the ClinicFlow247 public API (used by scripts/harness/e2e-booking.mjs; never shipped).
// Mirrors the real DTO shapes and status codes read from clinicflow-api (see src/lib/booking/api.ts).
// Scenario via MOCK_SCENARIO: ok | enquiry (no branches → site falls back to enquiry) | error500 | ratelimit
// Patient accounts (register/login/refresh, slot lock, POST /appointments, /appointments/my, cancel) are mocked in
// memory; MOCK_ACCESS_TTL_MS makes access tokens expire quickly to exercise the refresh path.
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 4010);
const SCENARIO = process.env.MOCK_SCENARIO || 'ok';
const ORIGIN = process.env.MOCK_ALLOW_ORIGIN || 'http://localhost:3100';
const CLINIC = { id: '5a1c0000-0000-4000-8000-000000000001', slug: 'suhasini-dental-clinic-and-implant-centre', name: 'Suhasini Dental Clinic and Implant Centre' };
const BRANCH = { id: '5a1c0000-0000-4000-8000-0000000000b1', name: 'Suhasini Dental Clinic — Tadepalle', slug: 'tadepalle', city: 'Tadepalle' };
const DOCTORS = [
  ['d0', 'Suhasini', 'MDS'],
  ['d1', 'Sindhu', 'MDS'],
  ['d2', 'Preethi', 'MDS'],
  ['d3', 'Naveen', 'Kumar'],
  ['d4', 'Varun', 'Krishna'],
  ['d5', 'Phani', 'MDS'],
  ['d6', 'Praveen', 'MDS'],
].map(([k, f, l], i) => ({ id: `5a1c0000-0000-4000-8000-0000000000d${i}`, firstName: f, lastName: l, fullName: `Dr. ${f} ${l}`, isActive: true, key: k }));
const booked = new Set(); // "doctorId|date|HH:mm:ss"
let guestBookCalls = 0;
const log = [];
const ACCESS_TTL = Number(process.env.MOCK_ACCESS_TTL_MS || 1_800_000);
const users = new Map(); // email → { id, email, password, firstName, lastName, phone, role }
users.set('doctor.qa@mock.test', { id: 'u-doc', email: 'doctor.qa@mock.test', password: 'DoctorPass1', firstName: 'Test', lastName: 'Doctor', role: 'DOCTOR' });
const access = new Map(); // token → { email, exp }
const refresh = new Map(); // token → email
const locks = new Map(); // lockId → { email, doctorId, branchId, date, startTime }
const appointments = []; // { ..., ownerEmail }
let seq = 0;

const issue = (u) => {
  const a = `acc-${++seq}`;
  const r = `ref-${seq}`;
  access.set(a, { email: u.email, exp: Date.now() + ACCESS_TTL });
  refresh.set(r, u.email);
  return { success: true, data: { accessToken: a, refreshToken: r, tokenType: 'Bearer', expiresIn: ACCESS_TTL, user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isFirstLogin: false } } };
};
const whoIs = (req) => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = access.get(t);
  return a && a.exp > Date.now() ? users.get(a.email) : null;
};
const strip = ({ ownerEmail, ...a }) => a; // eslint-disable-line no-unused-vars
function makeAppointment(doctorId, date, startTime, source, extra = {}) {
  const slot = slotsFor(doctorId, date).find((s) => s.startTime === startTime);
  booked.add(`${doctorId}|${date}|${startTime}`);
  const doc = DOCTORS.find((d) => d.id === doctorId);
  return {
    id: `appt-${++seq}`,
    clinicId: CLINIC.id,
    clinicName: CLINIC.name,
    branchId: BRANCH.id,
    branchName: BRANCH.name,
    doctorId,
    doctorName: doc?.fullName,
    appointmentDate: date,
    startTime,
    endTime: slot?.endTime,
    status: 'CONFIRMED',
    bookingSource: source,
    ...extra,
  };
}

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    Vary: 'Origin',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const err = (res, status, code, message) => send(res, status, { success: false, error: { code, message }, timestamp: new Date().toISOString() });

// Weekday evenings for consultants, plus mornings for Dr. Suhasini (d00) and Saturday morning.
function slotsFor(doctorId, date) {
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (wd === 0) return [];
  const isHead = doctorId.endsWith("d0");
  const ranges = wd === 6 ? (isHead ? [[10, 14]] : []) : isHead ? [[10, 14], [17, 20]] : [[17, 20]];
  const out = [];
  for (const [a, b] of ranges)
    for (let m = a * 60; m < b * 60; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const e = m + 30;
      const t = `${hh}:${mm}:00`;
      // Every third slot is already taken, to make the list realistic.
      const taken = booked.has(`${doctorId}|${date}|${t}`) || (m / 30) % 3 === 1;
      out.push({ startTime: t, endTime: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}:00`, available: !taken });
    }
  // A fully-booked day for the "no free slots" state: the 3rd of each month.
  if (date.endsWith('-03')) return out.map((s) => ({ ...s, available: false }));
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname.replace(/^\/api\/v1/, '');
  let body = '';
  for await (const c of req) body += c;
  const json = body ? JSON.parse(body) : {};
  log.push(`${req.method} ${url.pathname}${url.search}`);
  if (req.method === 'OPTIONS') return send(res, 200);
  if (p === '/__log') return send(res, 200, { log, guestBookCalls, appointments });

  // ── Patient accounts ──
  if (req.method === 'POST' && p === '/auth/register') {
    const email = String(json.email || '').toLowerCase();
    if (!json.firstName || !json.lastName || !/^(\+91)?[6-9]\d{9}$/.test(json.phone || '') || String(json.password || '').length < 8) return err(res, 400, 'VALIDATION_FAILED', 'Validation failed');
    if (users.has(email)) return err(res, 409, 'AUTH_EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    const u = { id: `u-${++seq}`, email, password: json.password, firstName: json.firstName, lastName: json.lastName, phone: json.phone, role: 'PATIENT' };
    users.set(email, u);
    return send(res, 201, issue(u));
  }
  if (req.method === 'POST' && p === '/auth/login') {
    const u = users.get(String(json.email || '').toLowerCase());
    if (!u || u.password !== json.password) return err(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    return send(res, 200, issue(u));
  }
  if (req.method === 'POST' && p === '/auth/refresh') {
    const email = refresh.get(json.refreshToken);
    if (!email) return err(res, 401, 'AUTH_REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired');
    refresh.delete(json.refreshToken); // rotation
    return send(res, 200, issue(users.get(email)));
  }
  if (req.method === 'POST' && p === '/auth/forgot-password') return send(res, 200, { success: true, data: null });
  {
    let m = p.match(/^\/clinics\/[^/]+\/doctors\/([^/]+)\/slots\/lock(?:\/([^/]+))?$/);
    const needsAuth = m || p === '/appointments' || p === '/appointments/my' || /^\/appointments\/[^/]+\/cancel$/.test(p);
    if (needsAuth) {
      const u = whoIs(req);
      if (!u) return send(res, 401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Full authentication is required' } });
      if (u.role !== 'PATIENT') return err(res, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', 'Forbidden');
      if (m && req.method === 'POST' && !m[2]) {
        const slot = slotsFor(m[1], json.date).find((s) => s.startTime === json.startTime);
        if (!slot || !slot.available) return err(res, 409, 'APPOINTMENT_SLOT_NOT_AVAILABLE', 'This slot is no longer available');
        const lockId = `lock-${++seq}`;
        locks.set(lockId, { email: u.email, doctorId: m[1], branchId: json.branchId, date: json.date, startTime: json.startTime });
        return send(res, 201, { lockId, doctorId: m[1], appointmentDate: json.date, startTime: json.startTime, expiresAt: new Date(Date.now() + 180000).toISOString(), secondsRemaining: 180 });
      }
      if (m && req.method === 'DELETE' && m[2]) {
        locks.delete(m[2]);
        return send(res, 204);
      }
      if (p === '/appointments' && req.method === 'POST') {
        const l = locks.get(json.lockId);
        if (!l || l.email !== u.email) return err(res, 404, 'SLOT_LOCK_NOT_FOUND', 'Slot lock not found or already released');
        locks.delete(json.lockId);
        const a = makeAppointment(l.doctorId, l.date, l.startTime, json.bookingSource || 'WEB', { patientName: `${u.firstName} ${u.lastName}`, notes: json.notes, ownerEmail: u.email });
        appointments.push(a);
        return send(res, 201, strip(a));
      }
      if (p === '/appointments/my' && req.method === 'GET') {
        // Plus one appointment at another clinic: the site must hide it.
        const other = { ...strip(makeAppointment(DOCTORS[0].id, '2030-01-07', '10:00:00', 'WEB')), clinicId: 'other-clinic', clinicName: 'Another clinic', doctorName: 'Dr. Elsewhere' };
        return send(res, 200, [...appointments.filter((a) => a.ownerEmail === u.email).map(strip), other]);
      }
      m = p.match(/^\/appointments\/([^/]+)\/cancel$/);
      if (m && req.method === 'PUT') {
        const a = appointments.find((x) => x.id === m[1] && x.ownerEmail === u.email);
        if (!a) return err(res, 404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
        if (a.status === 'CANCELLED') return err(res, 409, 'APPOINTMENT_ALREADY_CANCELLED', 'Appointment is already cancelled');
        a.status = 'CANCELLED';
        a.cancellationReason = json.reason;
        booked.delete(`${a.doctorId}|${a.appointmentDate}|${a.startTime}`);
        return send(res, 200, strip(a));
      }
    }
  }

  if (req.method === 'GET') {
    if (p === `/clinics/public/${CLINIC.slug}`) return send(res, 200, CLINIC);
    if (p.startsWith('/clinics/public/') && p.split('/').length === 4) return err(res, 404, 'CLINIC_NOT_FOUND', 'Clinic not found');
    if (p === `/clinics/public/${CLINIC.slug}/branches`) return send(res, 200, SCENARIO === 'enquiry' ? [] : [BRANCH]);
    if (p === `/clinics/${CLINIC.id}/doctors`) return send(res, 200, DOCTORS.map(({ key, ...d }) => d));
    let m = p.match(/^\/clinics\/[^/]+\/doctors\/([^/]+)\/slots$/);
    if (m) return send(res, 200, slotsFor(m[1], url.searchParams.get('date')));
    m = p.match(/^\/clinics\/[^/]+\/doctors\/([^/]+)\/slots\/next-available$/);
    if (m) {
      for (let i = 1; i < 40; i++) {
        const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
        const s = slotsFor(m[1], d).find((x) => x.available);
        if (s) return send(res, 200, { date: d, startTime: s.startTime, endTime: s.endTime });
      }
      return send(res, 204);
    }
  }
  if (req.method === 'POST') {
    if (p === '/auth/otp/send' || p === '/auth/otp/resend') {
      if (!/^[6-9]\d{9}$/.test(json.phone || '')) return err(res, 400, 'VALIDATION_FAILED', 'Enter a valid 10-digit Indian mobile number');
      return send(res, 200, { success: true, data: null });
    }
    if (p === '/appointments/guest-book') {
      guestBookCalls++;
      if (SCENARIO === 'ratelimit') return err(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please slow down.');
      if (SCENARIO === 'error500') return err(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
      if (json.otp !== '123456') return err(res, 400, 'OTP_INVALID', 'Invalid or expired OTP. Please request a new code and try again.');
      const key = `${json.doctorId}|${json.date}|${json.startTime}`;
      const slot = slotsFor(json.doctorId, json.date).find((s) => s.startTime === json.startTime);
      if (!slot || !slot.available) return err(res, 409, 'APPOINTMENT_SLOT_NOT_AVAILABLE', 'This slot is no longer available');
      booked.add(key);
      const doc = DOCTORS.find((d) => d.id === json.doctorId);
      return send(res, 201, {
        id: `appt-${guestBookCalls}`,
        clinicId: CLINIC.id,
        clinicName: CLINIC.name,
        branchId: BRANCH.id,
        branchName: BRANCH.name,
        doctorId: json.doctorId,
        doctorName: doc?.fullName,
        patientName: `${json.firstName} ${json.lastName}`,
        appointmentDate: json.date,
        startTime: json.startTime,
        endTime: slot.endTime,
        status: 'CONFIRMED',
        bookingSource: 'GUEST',
      });
    }
    if (p === `/clinics/public/${CLINIC.slug}/leads`) {
      if (!json.consentGiven) return err(res, 400, 'VALIDATION_FAILED', 'Consent must be given');
      return send(res, 201, { id: 'lead-1', name: json.name, email: json.email, phone: json.phone, preferredDate: json.preferredDate, message: json.message, createdAt: new Date().toISOString() });
    }
    // Test hook: mark a slot as taken (simulates another patient booking while this one types the OTP).
    if (p === '/__take') {
      booked.add(`${json.doctorId}|${json.date}|${json.startTime}`);
      return send(res, 200, { ok: true });
    }
  }
  err(res, 404, 'NOT_FOUND', 'Not found');
});
server.listen(PORT, () => console.log(`mock ClinicFlow on :${PORT} scenario=${SCENARIO}`));
