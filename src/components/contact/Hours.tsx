'use client';

import { useEffect, useState } from 'react';
import type { Day } from '@/lib/content/schemas';
import { formatSession, formatTime, nowInZone, openStatus, type OpenStatus } from '@/lib/hours';
import { cn } from '@/lib/cn';

type Hours = { day: Day; sessions: { opens: string; closes: string }[] }[];
export type HoursStrings = {
  openNow: string;
  closedNow: string;
  opensAt: string;
  closesAt: string;
  today: string;
  tomorrow: string;
  closed: string;
  day: string;
  morning: string;
  evening: string;
  todayLabel: string;
  title: string;
  timings: string;
  dayNames: Record<Day, string>;
};

const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

/** Hook: live open/closed status in the clinic's time zone, recomputed every minute. Null until mounted. */
function useClinicNow(hours: Hours, timezone: string) {
  const [state, setState] = useState<{ status: OpenStatus; today: Day } | null>(null);
  useEffect(() => {
    const tick = () => setState({ status: openStatus({ hours, timezone }), today: nowInZone(timezone).day });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours, timezone]);
  return state;
}

export function OpenNowBadge({ hours, timezone, strings, className }: { hours: Hours; timezone: string; strings: HoursStrings; className?: string }) {
  const now = useClinicNow(hours, timezone);
  // Status on one line, detail on the next, so the placeholder (shown until the clinic's local time is known) has the
  // same height as the badge and nothing below it moves (CLS).
  if (!now)
    return (
      <span className={cn('inline-flex flex-col items-start gap-1.5', className)} aria-hidden>
        <span className="block h-7 w-28 animate-pulse rounded-full bg-line" />
        <span className="block h-5 w-44 animate-pulse rounded-full bg-line/70" />
      </span>
    );
  const s = now.status;
  let detail = '';
  if (s.open) detail = fill(strings.closesAt, { time: formatTime(s.closesAt) });
  else if (s.nextOpen) {
    const when = s.nextOpen.isToday ? strings.today : s.nextOpen.isTomorrow ? strings.tomorrow : strings.dayNames[s.nextOpen.day];
    detail = fill(strings.opensAt, { when, time: formatTime(s.nextOpen.time) });
  }
  return (
    <p role="status" className={cn('inline-flex flex-col items-start gap-1.5 text-sm', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 font-heading font-semibold',
          s.open ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
        )}
      >
        <span className={cn('relative flex h-2.5 w-2.5')}>
          {s.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
          <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', s.open ? 'bg-success' : 'bg-danger')} />
        </span>
        {s.open ? strings.openNow : strings.closedNow}
      </span>
      <span className="min-h-5 leading-5 text-ink-muted">{detail}</span>
    </p>
  );
}

/** Weekly timings table; today's row is highlighted once mounted (computed in the clinic's time zone). */
export function TimingsTable({ hours, timezone, strings }: { hours: Hours; timezone: string; strings: HoursStrings }) {
  const now = useClinicNow(hours, timezone);
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-brand border border-line bg-surface text-left text-sm sm:text-base">
      <caption className="sr-only">{strings.title}</caption>
      <thead>
        <tr className="bg-secondary-soft font-heading text-ink">
          <th scope="col" className="px-4 py-3 font-semibold">{strings.day}</th>
          <th scope="col" className="px-4 py-3 font-semibold sm:hidden">{strings.timings}</th>
          <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{strings.morning}</th>
          <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{strings.evening}</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((h) => {
          const isToday = now?.today === h.day;
          const morning = h.sessions.find((s) => s.opens < '12:00');
          const evening = h.sessions.find((s) => s.opens >= '12:00');
          return (
            <tr key={h.day} className={cn('border-t border-line', isToday && 'bg-primary text-white')} aria-current={isToday ? 'date' : undefined}>
              <th scope="row" className="border-t border-line px-4 py-3 font-heading font-semibold">
                {strings.dayNames[h.day]}
                {isToday && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-bold text-dark">{strings.todayLabel}</span>}
              </th>
              <td className={cn('border-t border-line px-4 py-3 sm:hidden', !h.sessions.length && !isToday && 'text-ink-muted')}>
                {h.sessions.length
                  ? h.sessions.map((s) => (
                      <span key={s.opens} className="block whitespace-nowrap">
                        {formatSession(s)}
                      </span>
                    ))
                  : strings.closed}
              </td>
              <td className={cn('hidden border-t border-line px-4 py-3 sm:table-cell', !morning && !isToday && 'text-ink-muted')}>
                {morning ? formatSession(morning) : strings.closed}
              </td>
              <td className={cn('hidden border-t border-line px-4 py-3 sm:table-cell', !evening && !isToday && 'text-ink-muted')}>
                {evening ? formatSession(evening) : strings.closed}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
