import type { Clinic, Day } from './content/schemas';

export const DAYS: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type Session = { opens: string; closes: string };
type DayHours = { day: Day; sessions: Session[] };

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const formatSession = (s: Session) => `${formatTime(s.opens)} – ${formatTime(s.closes)}`;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Groups consecutive days that share identical sessions: Mon–Fri, Sat, Sun. */
export function groupDays(hours: DayHours[]): { days: Day[]; sessions: Session[] }[] {
  const groups: { days: Day[]; sessions: Session[] }[] = [];
  for (const h of hours) {
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.sessions) === JSON.stringify(h.sessions)) last.days.push(h.day);
    else groups.push({ days: [h.day], sessions: h.sessions });
  }
  return groups;
}

/** English one-line summary used in FAQ text and JSON-LD descriptions. */
export function hoursSummary(hours: DayHours[], dayName: (d: Day) => string, closedWord = 'closed'): string {
  return groupDays(hours)
    .map((g) => {
      const label = g.days.length > 1 ? `${dayName(g.days[0])}–${dayName(g.days[g.days.length - 1])}` : dayName(g.days[0]);
      return g.sessions.length ? `${label} ${g.sessions.map(formatSession).join(' and ')}` : `${label} ${closedWord}`;
    })
    .join('; ');
}

/** Current weekday + minutes in the clinic's time zone (Asia/Kolkata). */
export function nowInZone(timeZone: string, date = new Date()): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: get('weekday').toLowerCase() as Day,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export type OpenStatus =
  | { open: true; closesAt: string }
  | { open: false; nextOpen: { day: Day; time: string; isToday: boolean; isTomorrow: boolean } | null };

export function openStatus(clinic: Pick<Clinic, 'hours' | 'timezone'>, date = new Date()): OpenStatus {
  const { day, minutes } = nowInZone(clinic.timezone, date);
  const today = clinic.hours.find((h) => h.day === day);
  const current = today?.sessions.find((s) => minutes >= toMin(s.opens) && minutes < toMin(s.closes));
  if (current) return { open: true, closesAt: current.closes };

  const later = today?.sessions.find((s) => toMin(s.opens) > minutes);
  if (later) return { open: false, nextOpen: { day, time: later.opens, isToday: true, isTomorrow: false } };

  const idx = DAYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(idx + i) % 7];
    const h = clinic.hours.find((x) => x.day === d);
    if (h?.sessions.length) return { open: false, nextOpen: { day: d, time: h.sessions[0].opens, isToday: false, isTomorrow: i === 1 } };
  }
  return { open: false, nextOpen: null };
}
