import type { Day, Doctor } from './content/schemas';
import { DAYS, formatSession } from './hours';
import { getDict, t, type Lang } from './i18n';

/** Human-readable consultation lines, e.g. "Mon–Fri · 5:00 PM – 8:00 PM". Consecutive days are collapsed. */
export function consultLines(d: Doctor, lang: Lang): string[] {
  const dict = getDict(lang);
  const short = (x: Day) => t(dict, `days.short.${x}`);
  return d.consultation.map((c) => {
    const sorted = [...c.days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    const runs: Day[][] = [];
    for (const day of sorted) {
      const last = runs[runs.length - 1];
      if (last && DAYS.indexOf(day) === DAYS.indexOf(last[last.length - 1]) + 1) last.push(day);
      else runs.push([day]);
    }
    const days = runs.map((r) => (r.length > 2 ? `${short(r[0])}–${short(r[r.length - 1])}` : r.map(short).join(', '))).join(', ');
    return `${days} · ${formatSession(c)}`;
  });
}
