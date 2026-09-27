// Date/time helpers in the clinic's time zone (Asia/Kolkata). Pure.

import type { Day } from '../content/schemas';

const DAY_NAMES: Day[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Today's date (YYYY-MM-DD) in the given IANA zone. */
export function todayInZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Add days to a YYYY-MM-DD date (calendar arithmetic, zone-independent). */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(ymd: string): Day {
  const [y, m, d] = ymd.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export type Consultation = { days: Day[]; opens: string; closes: string };

/** Dates within [today, today+advanceDays] on which at least one of the doctors consults (from content). */
export function availableDates(schedules: Consultation[][], today: string, advanceDays: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= advanceDays; i++) {
    const d = addDays(today, i);
    const wd = weekdayOf(d);
    if (schedules.some((s) => s.some((c) => c.days.includes(wd)))) out.push(d);
  }
  return out;
}

/** "HH:mm[:ss]" → "HH:mm". */
export const hhmm = (t: string) => t.slice(0, 5);

/** Minutes since midnight for "HH:mm". */
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
