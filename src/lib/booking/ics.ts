// Minimal iCalendar (.ics) file for "Add to calendar". Times are given in IST (UTC+05:30, no DST) and
// written as UTC so every calendar app places them correctly.

const pad = (n: number) => String(n).padStart(2, '0');

function istToUtcStamp(ymd: string, hhmm: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, h, min) - (5 * 60 + 30) * 60_000);
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

export function buildIcs(e: { uid: string; title: string; description: string; location: string; date: string; start: string; end: string }): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SMSDC//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${istToUtcStamp(e.date, e.start)}`,
    `DTEND:${istToUtcStamp(e.date, e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    `LOCATION:${esc(e.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
