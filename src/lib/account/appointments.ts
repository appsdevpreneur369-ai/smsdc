// My appointments: which to show, how to group them, what can be cancelled. Pure.
import type { ApiMyAppointment } from '../booking/api';
import { hhmm } from '../booking/dates';

/** Statuses a patient can still cancel online (ClinicFlow Appointment#isCancellable). */
const CANCELLABLE = new Set(['CONFIRMED', 'PENDING_PAYMENT']);
/** Statuses that are finished whatever the date. */
const CLOSED = new Set(['CANCELLED', 'COMPLETED', 'NO_SHOW']);

/** Current time (HH:mm, 24 h) in the given IANA zone. */
export function timeInZone(timeZone: string, now = new Date()): string {
  const t = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return t.slice(0, 5);
}

export type GroupedAppointments = { upcoming: ApiMyAppointment[]; past: ApiMyAppointment[] };

/**
 * Only this clinic's appointments (a ClinicFlow patient account is platform-wide), split into upcoming
 * (soonest first) and past/cancelled (latest first). clinicId null → keep all (clinic id not known yet).
 */
export function groupAppointments(list: ApiMyAppointment[], clinicId: string | null, today: string, nowHHMM: string): GroupedAppointments {
  const mine = clinicId ? list.filter((a) => !a.clinicId || a.clinicId === clinicId) : list;
  const key = (a: ApiMyAppointment) => `${a.appointmentDate}T${hhmm(a.startTime)}`;
  const isUpcoming = (a: ApiMyAppointment) => !CLOSED.has(a.status) && key(a) >= `${today}T${nowHHMM}`;
  const upcoming = mine.filter(isUpcoming).sort((a, b) => key(a).localeCompare(key(b)));
  const past = mine.filter((a) => !isUpcoming(a)).sort((a, b) => key(b).localeCompare(key(a)));
  return { upcoming, past };
}

export const canCancel = (a: ApiMyAppointment) => CANCELLABLE.has(a.status);
