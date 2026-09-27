'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Loader2, LogOut, RotateCcw, Stethoscope } from 'lucide-react';
import { buttonClass } from '@/components/ui/primitives-client';
import { useBooking } from '@/components/booking/BookingProvider';
import { canCancel, groupAppointments, timeInZone } from '@/lib/account/appointments';
import { sessionDisplayName } from '@/lib/account/session';
import { BookingError, type ApiMyAppointment } from '@/lib/booking/api';
import { hhmm, todayInZone } from '@/lib/booking/dates';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/hours';
import { useAccount } from './AccountProvider';
import { AuthPanel, accountErrorText } from './AuthPanel';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

/** /account: sign in / sign up, then the patient's appointments at this clinic with online cancel. */
export function AccountPage() {
  const { config, open, resolved, ensureResolved } = useBooking();
  const { api, session, ready, signOut } = useAccount();
  const a = config.accountStrings;
  const f = config.strings;

  const [list, setList] = useState<ApiMyAppointment[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void ensureResolved();
  }, [ensureResolved]);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setList(await api.myAppointments());
    } catch (e) {
      setList(null);
      setLoadError(accountErrorText(e, a, f));
    }
  }, [api, a, f]);

  useEffect(() => {
    setList(null);
    setNotice('');
    if (session) void load();
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clinicId = resolved?.service.clinicId ?? null;
  const groups = useMemo(() => (list ? groupAppointments(list, clinicId, todayInZone(config.timezone), timeInZone(config.timezone)) : null), [list, clinicId, config.timezone]);

  if (!ready) {
    return (
      <div className="h-64 animate-pulse rounded-[2rem] bg-line/60" role="status" aria-label={a.loading}>
        <span className="sr-only">{a.loading}</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <AuthPanel a={a} f={f} consentText={config.consentText} privacyHref={config.privacyHref} initialView="signin" headingLevel="h2" />
      </div>
    );
  }

  const onCancelled = (updated: ApiMyAppointment) => {
    setList((l) => (l ? l.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) : l));
    setNotice(a.cancelled);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold sm:text-3xl">{fill(a.greeting, { name: sessionDisplayName(session) })}</h2>
          <p className="mt-1 break-all text-ink-muted">{session.user.email}</p>
          <p className="mt-1 text-sm text-primary-dark">{a.emailNote}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass('primary', 'md')} onClick={() => open()}>
            {a.bookNew}
          </button>
          <button type="button" className={buttonClass('outline', 'md')} onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden /> {a.signOut}
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="flex gap-2 rounded-2xl border border-primary/20 bg-secondary-soft p-4 text-sm font-medium">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {notice}
        </p>
      )}

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="flex gap-2 font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden /> {loadError}
          </p>
          {session && (
            <button type="button" onClick={() => void load()} className={cn(buttonClass('outline', 'sm'), 'mt-3')}>
              <RotateCcw className="h-4 w-4" aria-hidden /> {f.tryAgain}
            </button>
          )}
        </div>
      ) : !groups ? (
        <p className="flex items-center gap-2 text-sm font-medium text-ink-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {a.loading}
        </p>
      ) : (
        <>
          <section aria-labelledby="upcoming-h" data-appointments="upcoming">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="upcoming-h" className="text-xl font-bold">
                {a.upcoming}
              </h2>
              <button type="button" onClick={() => void load()} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <RotateCcw className="h-4 w-4" aria-hidden /> {a.refresh}
              </button>
            </div>
            {groups.upcoming.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {groups.upcoming.map((x) => (
                  <AppointmentCard key={x.id} appt={x} upcoming onCancelled={onCancelled} />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-5 text-ink-muted">{a.none}</p>
            )}
          </section>
          {groups.past.length > 0 && (
            <section aria-labelledby="past-h" data-appointments="past">
              <h2 id="past-h" className="mb-4 text-xl font-bold">
                {a.past}
              </h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {groups.past.map((x) => (
                  <AppointmentCard key={x.id} appt={x} onCancelled={onCancelled} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AppointmentCard({ appt, upcoming = false, onCancelled }: { appt: ApiMyAppointment; upcoming?: boolean; onCancelled: (a: ApiMyAppointment) => void }) {
  const { config } = useBooking();
  const { api } = useAccount();
  const a = config.accountStrings;
  const f = config.strings;
  const uid = useId();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [y, m, d] = appt.appointmentDate.split('-').map(Number);
  const date = new Intl.DateTimeFormat(config.lang === 'te' ? 'te-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  const time = `${formatTime(hhmm(appt.startTime))}${appt.endTime ? ` – ${formatTime(hhmm(appt.endTime))}` : ''}`;
  const statusLabel = a[`status_${appt.status}`] ?? appt.status;
  const cancelled = appt.status === 'CANCELLED';

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      onCancelled(await api.cancel(appt.id, reason.trim() || a.cancelDefaultReason));
      setConfirming(false);
    } catch (e) {
      setError(e instanceof BookingError && e.kind === 'cannotCancel' ? a.cannotCancel : accountErrorText(e, a, f));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={cn('rounded-brand border bg-surface p-5 shadow-soft', cancelled ? 'border-line opacity-80' : 'border-line')} data-status={appt.status}>
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Stethoscope className="h-5 w-5 shrink-0 text-primary" aria-hidden /> {appt.doctorName ?? ''}
        </p>
        <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', cancelled ? 'bg-danger/10 text-danger' : appt.status === 'CONFIRMED' ? 'bg-success/15 text-ink' : 'bg-line text-ink')}>{statusLabel}</span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <dt className="sr-only">{f.dateLabel}</dt>
          <CalendarDays className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <dd>{date}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">{f.timeLabel}</dt>
          <Clock className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <dd>{time}</dd>
        </div>
        {appt.branchName && (
          <div className="text-ink-muted">
            <dt className="sr-only">{f.clinicLabel}</dt>
            <dd>{appt.branchName}</dd>
          </div>
        )}
      </dl>

      {upcoming && canCancel(appt) && !confirming && (
        <button type="button" onClick={() => setConfirming(true)} className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-danger underline-offset-2 hover:underline">
          {a.cancel}
        </button>
      )}
      {confirming && (
        <div className="mt-4 space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4" role="group" aria-labelledby={`${uid}-q`}>
          <p id={`${uid}-q`} className="font-semibold">
            {a.cancelConfirm}
          </p>
          <div>
            <label htmlFor={`${uid}-reason`} className="block text-sm font-medium">
              {a.cancelReason}
            </label>
            <input id={`${uid}-reason`} type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 block min-h-[44px] w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void cancel()} className={cn(buttonClass('primary', 'sm'), 'bg-danger hover:bg-danger disabled:opacity-60')}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {a.cancelYes}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={buttonClass('ghost', 'sm')} autoFocus>
              {a.cancelNo}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
