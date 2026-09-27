// ClinicFlow patient-account calls, straight from the browser (this origin is in the API's CORS list).
//  register → POST /auth/register (creates a PATIENT and returns tokens: signed in straight away)
//  login    → POST /auth/login {clinicSlug}    refresh → POST /auth/refresh (rotating refresh token)
//  booking  → POST /clinics/{c}/doctors/{d}/slots/lock, then POST /appointments {lockId} (no OTP: the JWT is the identity)
//  manage   → GET /appointments/my, PUT /appointments/{id}/cancel
// Tokens are only ever sent in the Authorization header to the ClinicFlow API.
import type { z } from 'zod';
import { AnyBody, AppointmentSchema, AuthResponseSchema, BookingError, LockSchema, MyAppointmentListSchema, MyAppointmentSchema, parseResponse, safeFetch, type ApiAuthResponse } from '../booking/api';
import { splitFullName } from '../booking/validation';
import { readSession, writeSession, type PatientSession } from './session';

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
};

type Store = {
  read: () => PatientSession | null;
  write: (s: PatientSession | null) => void;
};

/** Refresh this long before the access token actually expires. */
const EXPIRY_SKEW_MS = 60_000;

const RefreshSchema = AuthResponseSchema.extend({
  user: AuthResponseSchema.shape.user.optional(),
});

export class PatientApi {
  private refreshing: Promise<PatientSession> | null = null;

  constructor(
    private baseUrl: string,
    private clinicSlug: string,
    private store: Store = { read: readSession, write: writeSession },
    private now: () => number = Date.now,
  ) {}

  get session(): PatientSession | null {
    return this.store.read();
  }

  private toSession(a: z.infer<typeof RefreshSchema>, prev?: PatientSession | null): PatientSession {
    return {
      accessToken: a.accessToken,
      refreshToken: a.refreshToken,
      expiresAt: this.now() + (a.expiresIn ?? 30 * 60_000), // ClinicFlow sends milliseconds
      user: {
        id: a.user?.id ?? prev?.user.id ?? '',
        email: a.user?.email ?? prev?.user.email ?? '',
        firstName: a.user?.firstName ?? prev?.user.firstName ?? '',
        lastName: a.user?.lastName ?? prev?.user.lastName ?? '',
      },
    };
  }

  private async post<T extends z.ZodTypeAny>(path: string, body: unknown, schema: T): Promise<z.infer<T>> {
    const res = await safeFetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return parseResponse(res, schema);
  }

  /** Staff accounts (doctor/admin) use ClinicFlow itself; this site signs in patients only. */
  private signIn(a: ApiAuthResponse): PatientSession {
    if (a.user.role !== 'PATIENT') throw new BookingError('notPatient');
    const s = this.toSession(a);
    this.store.write(s);
    return s;
  }

  async register(input: RegisterInput): Promise<PatientSession> {
    const { firstName, lastName } = splitFullName(input.fullName);
    const body = {
      firstName,
      lastName,
      email: input.email.trim(),
      phone: input.phone,
      password: input.password,
    };
    return this.signIn(await this.post('/auth/register', body, AuthResponseSchema));
  }

  async login(email: string, password: string): Promise<PatientSession> {
    return this.signIn(await this.post('/auth/login', { email: email.trim(), password, clinicSlug: this.clinicSlug }, AuthResponseSchema));
  }

  /** Emails a reset link to ClinicFlow's clinic-branded reset page. Same response whether or not the email exists. */
  async forgotPassword(email: string): Promise<void> {
    await this.post('/auth/forgot-password', { email: email.trim(), clinicSlug: this.clinicSlug }, AnyBody);
  }

  logout(): void {
    this.store.write(null);
  }

  /** One refresh at a time; a rejected refresh token signs the patient out. */
  refresh(): Promise<PatientSession> {
    if (!this.refreshing) {
      const prev = this.store.read();
      this.refreshing = (async () => {
        if (!prev) throw new BookingError('unauthorized');
        try {
          const s = this.toSession(await this.post('/auth/refresh', { refreshToken: prev.refreshToken }, RefreshSchema), prev);
          this.store.write(s);
          return s;
        } catch (e) {
          if (e instanceof BookingError && (e.kind === 'unauthorized' || e.kind === 'badCredentials' || e.kind === 'accountDisabled')) {
            this.store.write(null);
            throw new BookingError('unauthorized');
          }
          throw e;
        }
      })().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async token(): Promise<string> {
    const s = this.store.read();
    if (!s) throw new BookingError('unauthorized');
    if (s.expiresAt - EXPIRY_SKEW_MS <= this.now()) return (await this.refresh()).accessToken;
    return s.accessToken;
  }

  /** Authenticated call; on a 401 it refreshes once and retries. */
  private async authed<T extends z.ZodTypeAny>(method: string, path: string, schema: T, body?: unknown): Promise<z.infer<T>> {
    const send = (token: string) =>
      safeFetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    let res = await send(await this.token());
    if (res.status === 401) res = await send((await this.refresh()).accessToken);
    if (res.status === 401) {
      this.store.write(null);
      throw new BookingError('unauthorized');
    }
    return parseResponse(res, schema);
  }

  lockSlot(clinicId: string, doctorId: string, body: { branchId: string; date: string; startTime: string }) {
    return this.authed('POST', `/clinics/${clinicId}/doctors/${doctorId}/slots/lock`, LockSchema, body);
  }

  async releaseLock(clinicId: string, doctorId: string, lockId: string): Promise<void> {
    await this.authed('DELETE', `/clinics/${clinicId}/doctors/${doctorId}/slots/lock/${lockId}`, AnyBody);
  }

  book(lockId: string, notes: string) {
    return this.authed('POST', '/appointments', AppointmentSchema, {
      lockId,
      notes,
      bookingSource: 'WEB',
    });
  }

  myAppointments() {
    return this.authed('GET', '/appointments/my', MyAppointmentListSchema);
  }

  cancel(appointmentId: string, reason: string) {
    return this.authed('PUT', `/appointments/${appointmentId}/cancel`, MyAppointmentSchema, { reason });
  }
}
