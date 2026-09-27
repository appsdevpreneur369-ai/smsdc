'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, Loader2, MapPin, Phone, RotateCcw } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { buttonClass } from '@/components/ui/primitives-client';
import { cn } from '@/lib/cn';
import { BookingError } from '@/lib/booking/api';
import type { Branch, BookingRequest, BookingResult, NextAvailable, SlotOption } from '@/lib/booking/BookingService';
import { weekdayOf } from '@/lib/booking/dates';
import { buildIcs } from '@/lib/booking/ics';
import { doctorsForOption, findOption } from '@/lib/booking/treatments';
import { isSixDigitOtp, isValidEmail, isValidFullName, maskIndianMobile, normalizeIndianMobile } from '@/lib/booking/validation';
import { formatTime } from '@/lib/hours';
import { useBooking, type BookingDraft } from './BookingProvider';

type Field = 'fullName' | 'phone' | 'email' | 'branchId' | 'treatmentId' | 'date' | 'time' | 'consent';
type Errors = Partial<Record<Field, string>>;
type Step = 'form' | 'otp' | 'success';
type Banner = { kind: 'error' | 'info'; text: string; retry?: () => void; whatsapp?: boolean } | null;

const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

export function BookingForm({ variant, onDone }: { variant: 'modal' | 'page'; onDone?: () => void }) {
  const { config, draft, setDraft, resetDraft, resolved, ensureResolved, markBooked } = useBooking();
  const s = config.strings;
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;

  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [nextAvail, setNextAvail] = useState<NextAvailable | 'loading' | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const fieldRefs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  const otpRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const service = resolved?.service ?? null;

  useEffect(() => {
    void ensureResolved();
  }, [ensureResolved]);

  // Branches (single branch → pre-selected, shown read-only).
  useEffect(() => {
    if (!service) return;
    let live = true;
    service
      .getBranches()
      .then((b) => {
        if (!live) return;
        setBranches(b);
        if (b.length === 1) setDraft((d) => (d.branchId === b[0].id ? d : { ...d, branchId: b[0].id }));
        else setDraft((d) => (b.some((x) => x.id === d.branchId) ? d : { ...d, branchId: '' }));
      })
      .catch(() => live && setBranches([]));
    return () => {
      live = false;
    };
  }, [service, setDraft]);

  const option = findOption(config.treatments, draft.treatmentId);
  const doctorSlugs = useMemo(() => doctorsForOption(option, draft.preferredDoctor), [option, draft.preferredDoctor]);
  const dates = useMemo(() => (service && doctorSlugs.length ? service.getAvailableDates(doctorSlugs) : []), [service, doctorSlugs]);

  // Drop a date that is no longer offered for the chosen treatment/doctor.
  useEffect(() => {
    if (draft.date && dates.length && !dates.includes(draft.date)) setDraft({ date: '', time: '' });
  }, [dates, draft.date, setDraft]);

  // Live slots for the chosen doctor(s) + date (ClinicFlow mode only).
  const loadSlots = useCallback(async () => {
    if (!service?.liveSlots || !draft.date || !draft.branchId || !doctorSlugs.length) {
      setSlots(null);
      setNextAvail(null);
      return;
    }
    setSlotsLoading(true);
    setNextAvail(null);
    try {
      const list = await service.getSlots(doctorSlugs, draft.branchId, draft.date);
      setSlots(list);
      if (!list.length) {
        setNextAvail('loading');
        setNextAvail(await service.getNextAvailable(doctorSlugs, draft.branchId).catch(() => null));
      }
    } catch (e) {
      setSlots([]);
      setBanner({ kind: 'error', text: errorText(e), retry: () => void loadSlots(), whatsapp: true });
    } finally {
      setSlotsLoading(false);
    }
  }, [service, draft.date, draft.branchId, doctorSlugs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Preferred-time options (enquiry / WhatsApp): the mapped doctors' consultation sessions on that weekday.
  const sessions = useMemo(() => {
    if (!draft.date || service?.liveSlots) return [];
    const wd = weekdayOf(draft.date);
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const slug of doctorSlugs) {
      for (const c of config.doctors.find((d) => d.slug === slug)?.consultation ?? []) {
        if (!c.days.includes(wd)) continue;
        const v = `${c.opens}-${c.closes}`;
        if (seen.has(v)) continue;
        seen.add(v);
        out.push({ value: v, label: `${formatTime(c.opens)} – ${formatTime(c.closes)}` });
      }
    }
    return out.sort((a, b) => a.value.localeCompare(b.value));
  }, [draft.date, service, doctorSlugs, config.doctors]);

  const multiDoctor = doctorSlugs.length > 1;
  const dateLabel = useCallback(
    (ymd: string) => {
      const [y, m, d] = ymd.split('-').map(Number);
      return new Intl.DateTimeFormat(config.lang === 'te' ? 'te-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
    },
    [config.lang],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback(
    (d: BookingDraft): Errors => {
      const e: Errors = {};
      if (!d.fullName.trim()) e.fullName = s.required;
      else if (!isValidFullName(d.fullName)) e.fullName = s.nameInvalid;
      if (!d.phone.trim()) e.phone = s.required;
      else if (!normalizeIndianMobile(d.phone)) e.phone = s.phoneInvalid;
      if (!d.email.trim()) e.email = s.required;
      else if (!isValidEmail(d.email)) e.email = s.emailInvalid;
      if (!d.branchId) e.branchId = s.required;
      if (!d.treatmentId) e.treatmentId = s.required;
      if (!d.date) e.date = d.treatmentId ? s.required : s.pickTreatmentFirst;
      if (service?.liveSlots && !d.time) e.time = d.date ? s.required : s.pickDateFirst;
      if (!d.consent) e.consent = s.consentRequired;
      return e;
    },
    [s, service],
  );

  const onBlur = (f: Field) => {
    setTouched((t) => ({ ...t, [f]: true }));
    const e = validate(draft);
    setErrors((prev) => ({ ...prev, [f]: e[f] }));
  };

  const update = (patch: Partial<BookingDraft>, f?: Field) => {
    const next = { ...draft, ...patch };
    setDraft(patch);
    if (f && touched[f]) setErrors((prev) => ({ ...prev, [f]: validate(next)[f] }));
    setBanner(null);
  };

  const buildRequest = (): BookingRequest => {
    const [time, slotDoctor] = draft.time.includes('|') ? draft.time.split('|') : [draft.time, ''];
    return {
      fullName: draft.fullName,
      phone: normalizeIndianMobile(draft.phone) ?? '',
      email: draft.email,
      branchId: draft.branchId,
      treatmentLabel: option?.label ?? '',
      doctorSlug: slotDoctor || doctorSlugs[0] || '',
      date: draft.date,
      time: service?.liveSlots ? time : time ? prettyRange(time) : '',
      honeypot: draft.honeypot,
    };
  };

  const whatsappFallbackHref = () => {
    const req = buildRequest();
    const doctor = config.doctors.find((d) => d.slug === req.doctorSlug)?.displayName ?? '';
    const msg = fill(config.whatsappTemplate, {
      clinic: config.clinic.shortName,
      name: req.fullName.trim(),
      phone: req.phone ? `+91 ${req.phone}` : draft.phone,
      email: req.email.trim(),
      problem: req.treatmentLabel,
      doctor,
      day: req.date || s.anyTime,
      time: req.time ? (service?.liveSlots ? formatTime(req.time) : req.time) : s.anyTime,
    });
    return `https://wa.me/${config.clinic.whatsappDigits}?text=${encodeURIComponent(msg)}`;
  };

  function errorText(e: unknown): string {
    if (e instanceof BookingError) {
      if (e.kind === 'network') return s.errNetwork;
      if (e.kind === 'rateLimit') return s.errRateLimit;
      if (e.kind === 'server' || e.kind === 'invalidResponse') return s.errServer;
      if (e.kind === 'slotTaken') return s.slotTaken;
      if (e.kind === 'otpInvalid') return s.otpInvalid;
      return fill(s.errRequest, { msg: e.message && e.message !== e.kind ? e.message : s.errServer });
    }
    return s.errServer;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!service || submitting) return;
    const e = validate(draft);
    setErrors(e);
    setTouched({ fullName: true, phone: true, email: true, branchId: true, treatmentId: true, date: true, time: true, consent: true });
    const firstBad = (['fullName', 'phone', 'email', 'branchId', 'treatmentId', 'date', 'time', 'consent'] as Field[]).find((f) => e[f]);
    if (firstBad) {
      fieldRefs.current[firstBad]?.focus();
      return;
    }
    if (draft.honeypot) return; // bot: silently stop, nothing is sent
    setSubmitting(true);
    setBanner(null);
    try {
      const req = buildRequest();
      if (service.requiresOtp) {
        await service.sendOtp(req.phone);
        setVerifiedPhone(req.phone);
        setOtp('');
        setOtpError('');
        setResendIn(config.otpResendSeconds);
        setStep('otp');
        return;
      }
      const res = await service.submitEnquiry(req);
      if (res.kind === 'whatsapp') window.open(res.href, '_blank', 'noopener,noreferrer');
      finish(res);
    } catch (err) {
      setBanner({ kind: 'error', text: service.requiresOtp && err instanceof BookingError && err.kind !== 'rateLimit' && err.kind !== 'network' ? s.errOtpSend : errorText(err), retry: () => void submit(), whatsapp: true });
    } finally {
      setSubmitting(false);
    }
  };

  const finish = (res: BookingResult) => {
    setResult(res);
    setStep('success');
    markBooked();
    requestAnimationFrame(() => successRef.current?.focus());
  };

  // OTP resend countdown
  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  useEffect(() => {
    if (step === 'otp') requestAnimationFrame(() => otpRef.current?.focus());
  }, [step]);

  const resend = async () => {
    if (!service || resendIn > 0) return;
    try {
      await service.sendOtp(verifiedPhone, true);
      setResendIn(config.otpResendSeconds);
      setBanner({ kind: 'info', text: s.resent });
    } catch (e) {
      setBanner({ kind: 'error', text: errorText(e), whatsapp: true });
    }
  };

  const verifyAndBook = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!service || submitting) return;
    if (!isSixDigitOtp(otp) || !(await service.verifyOtp(verifiedPhone, otp))) {
      setOtpError(s.otpInvalid);
      otpRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setBanner(null);
    setOtpError('');
    try {
      finish(await service.book({ ...buildRequest(), otp: otp.trim() }));
    } catch (e) {
      if (e instanceof BookingError && e.kind === 'otpInvalid') {
        setOtpError(s.otpInvalid);
        otpRef.current?.focus();
      } else if (e instanceof BookingError && e.kind === 'slotTaken') {
        // Keep everything else; clear only the time and reload the slots.
        setDraft({ time: '' });
        setStep('form');
        setBanner({ kind: 'error', text: s.slotTaken });
        setErrors((p) => ({ ...p, time: s.slotTaken }));
        void loadSlots();
        requestAnimationFrame(() => fieldRefs.current.time?.focus());
      } else {
        setBanner({ kind: 'error', text: errorText(e), retry: () => void verifyAndBook(), whatsapp: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doneAndReset = () => {
    resetDraft();
    setStep('form');
    setResult(null);
    setErrors({});
    setTouched({});
    onDone?.();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!service) {
    return (
      <div className="space-y-4" aria-busy="true">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {s.checking}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-xl bg-line/60" />
          ))}
        </div>
      </div>
    );
  }

  if (step === 'success' && result) return <Success result={result} successRef={successRef} onDone={doneAndReset} />;

  const bannerEl = banner && (
    <div role={banner.kind === 'error' ? 'alert' : 'status'} className={cn('rounded-2xl border p-4 text-sm', banner.kind === 'error' ? 'border-danger/30 bg-danger/5' : 'border-primary/20 bg-secondary-soft')}>
      <p className="flex gap-2 font-medium">
        {banner.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
        {banner.text}
      </p>
      {(banner.retry || banner.whatsapp) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {banner.retry && (
            <button type="button" onClick={banner.retry} className={buttonClass('outline', 'sm')}>
              <RotateCcw className="h-4 w-4" aria-hidden /> {s.tryAgain}
            </button>
          )}
          {banner.whatsapp && (
            <a href={whatsappFallbackHref()} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsapp', 'sm')}>
              <WhatsAppIcon className="h-4 w-4" /> {s.whatsappInstead}
            </a>
          )}
        </div>
      )}
    </div>
  );

  if (step === 'otp') {
    return (
      <form onSubmit={verifyAndBook} noValidate className="space-y-5">
        <div>
          <h3 className="text-xl font-bold">{s.otpTitle}</h3>
          <p className="mt-1 text-ink-muted">{fill(s.otpHelp, { phone: maskIndianMobile(verifiedPhone) })}</p>
        </div>
        {bannerEl}
        <div>
          <label htmlFor={id('otp')} className="block font-heading text-sm font-semibold">
            {s.otpLabel}
          </label>
          <input
            ref={otpRef}
            id={id('otp')}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
              setOtpError('');
            }}
            aria-invalid={!!otpError}
            aria-describedby={otpError ? id('otp-err') : undefined}
            className={inputCls(!!otpError, 'mt-2 max-w-[12rem] text-center font-heading text-2xl tracking-[0.4em]')}
          />
          {otpError && (
            <p id={id('otp-err')} className="mt-1.5 text-sm font-medium text-danger">
              {otpError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={resend} disabled={resendIn > 0} className="min-h-[44px] font-semibold text-primary underline-offset-2 hover:underline disabled:text-ink-muted disabled:no-underline">
            {resendIn > 0 ? fill(s.resendIn, { s: String(resendIn) }) : s.resend}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setBanner(null);
              requestAnimationFrame(() => fieldRefs.current.phone?.focus());
            }}
            className="min-h-[44px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            {s.changeNumber}
          </button>
        </div>
        <button type="submit" disabled={submitting} className={cn(buttonClass('primary', 'lg'), 'w-full disabled:opacity-60 sm:w-auto')}>
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          {submitting ? s.sending : s.verifyBook}
        </button>
      </form>
    );
  }

  const submitLabel = service.mode === 'clinicflow' ? s.submitBook : service.mode === 'enquiry' ? s.submitEnquiry : s.submitWhatsapp;
  const err = (f: Field) => (touched[f] ? errors[f] : undefined);
  const describe = (f: Field) => (err(f) ? id(`${f}-err`) : undefined);
  const setRef = (f: Field) => (el: HTMLElement | null) => {
    fieldRefs.current[f] = el;
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-variant={variant}>
      {service.mode !== 'clinicflow' && (
        <p className="rounded-2xl bg-secondary-soft p-4 text-sm text-primary-dark">{service.mode === 'enquiry' ? s.modeEnquiry : s.modeWhatsapp}</p>
      )}
      {bannerEl}
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <FieldBox label={s.name} htmlFor={id('fullName')} error={err('fullName')} errId={id('fullName-err')} required reqLabel={s.requiredMark}>
          <input ref={setRef('fullName')} id={id('fullName')} type="text" autoComplete="name" placeholder={s.namePlaceholder} value={draft.fullName} onChange={(e) => update({ fullName: e.target.value }, 'fullName')} onBlur={() => onBlur('fullName')} aria-invalid={!!err('fullName')} aria-describedby={describe('fullName')} aria-required="true" className={inputCls(!!err('fullName'))} />
        </FieldBox>

        <FieldBox label={s.phone} htmlFor={id('phone')} error={err('phone')} errId={id('phone-err')} required reqLabel={s.requiredMark}>
          <div className={cn('mt-2 flex items-stretch overflow-hidden rounded-xl border bg-surface focus-within:ring-2', err('phone') ? 'border-danger focus-within:ring-danger/30' : 'border-line focus-within:border-primary focus-within:ring-primary/30')}>
            <span className="flex items-center border-r border-line bg-bg px-3 font-medium text-ink-muted" aria-hidden>
              +91
            </span>
            <input ref={setRef('phone')} id={id('phone')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={s.phonePlaceholder} value={draft.phone} onChange={(e) => update({ phone: e.target.value }, 'phone')} onBlur={() => onBlur('phone')} aria-invalid={!!err('phone')} aria-describedby={describe('phone')} aria-required="true" className="min-h-[48px] w-full min-w-0 bg-transparent px-3 text-base outline-none" />
          </div>
        </FieldBox>

        <FieldBox label={s.email} htmlFor={id('email')} error={err('email')} errId={id('email-err')} required reqLabel={s.requiredMark}>
          <input ref={setRef('email')} id={id('email')} type="email" autoComplete="email" inputMode="email" placeholder={s.emailPlaceholder} value={draft.email} onChange={(e) => update({ email: e.target.value }, 'email')} onBlur={() => onBlur('email')} aria-invalid={!!err('email')} aria-describedby={describe('email')} aria-required="true" className={inputCls(!!err('email'))} />
        </FieldBox>

        <FieldBox label={s.branch} htmlFor={id('branchId')} error={err('branchId')} errId={id('branchId-err')} required reqLabel={s.requiredMark}>
          {branches && branches.length === 1 ? (
            <input ref={setRef('branchId')} id={id('branchId')} type="text" readOnly value={branches[0].name} className={inputCls(false, 'bg-bg text-ink-muted')} />
          ) : (
            <select ref={setRef('branchId')} id={id('branchId')} value={draft.branchId} onChange={(e) => update({ branchId: e.target.value, date: '', time: '' }, 'branchId')} onBlur={() => onBlur('branchId')} aria-invalid={!!err('branchId')} aria-describedby={describe('branchId')} aria-required="true" className={inputCls(!!err('branchId'))} disabled={!branches}>
              <option value="">{s.branch}</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </FieldBox>

        <FieldBox label={s.treatment} htmlFor={id('treatmentId')} error={err('treatmentId')} errId={id('treatmentId-err')} required reqLabel={s.requiredMark}>
          <select ref={setRef('treatmentId')} id={id('treatmentId')} value={draft.treatmentId} onChange={(e) => update({ treatmentId: e.target.value, date: '', time: '', preferredDoctor: findOption(config.treatments, e.target.value)?.doctors.includes(draft.preferredDoctor ?? '') ? draft.preferredDoctor : null }, 'treatmentId')} onBlur={() => onBlur('treatmentId')} aria-invalid={!!err('treatmentId')} aria-describedby={describe('treatmentId')} aria-required="true" className={inputCls(!!err('treatmentId'))}>
            <option value="">{s.treatmentPlaceholder}</option>
            {config.treatments.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldBox>

        <FieldBox label={s.date} htmlFor={id('date')} error={err('date')} errId={id('date-err')} required reqLabel={s.requiredMark}>
          <select ref={setRef('date')} id={id('date')} value={draft.date} onChange={(e) => update({ date: e.target.value, time: '' }, 'date')} onBlur={() => onBlur('date')} aria-invalid={!!err('date')} aria-describedby={describe('date')} aria-required="true" disabled={!draft.treatmentId} className={inputCls(!!err('date'))}>
            <option value="">{draft.treatmentId ? s.date : s.pickTreatmentFirst}</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {dateLabel(d)}
              </option>
            ))}
          </select>
        </FieldBox>

        <div className="sm:col-span-2">
          {service.liveSlots ? (
            <FieldBox label={s.time} htmlFor={id('time')} error={err('time')} errId={id('time-err')} required reqLabel={s.requiredMark}>
              {slotsLoading ? (
                <div className="mt-2 space-y-2" role="status" aria-label={s.loadingSlots}>
                  <div className="h-12 animate-pulse rounded-xl bg-line/70" />
                  <span className="sr-only">{s.loadingSlots}</span>
                </div>
              ) : draft.date && slots && !slots.length ? (
                <div className="mt-2 rounded-xl border border-dashed border-line p-4 text-sm">
                  <p className="font-medium">{s.noSlots}</p>
                  {nextAvail === 'loading' && <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" aria-hidden />}
                  {nextAvail && nextAvail !== 'loading' && (
                    <button type="button" className={cn(buttonClass('outline', 'sm'), 'mt-3')} onClick={() => update({ date: nextAvail.date, time: `${nextAvail.time}|${nextAvail.doctorSlug}` }, 'date')}>
                      {fill(s.nextAvailable, { date: `${dateLabel(nextAvail.date)}, ${formatTime(nextAvail.time)}` })}
                    </button>
                  )}
                </div>
              ) : (
                <select ref={setRef('time')} id={id('time')} value={draft.time} onChange={(e) => update({ time: e.target.value }, 'time')} onBlur={() => onBlur('time')} aria-invalid={!!err('time')} aria-describedby={describe('time')} aria-required="true" disabled={!draft.date || !slots} className={inputCls(!!err('time'))}>
                  <option value="">{draft.date ? s.timePlaceholder : s.pickDateFirst}</option>
                  {(slots ?? []).map((sl) => (
                    <option key={`${sl.time}|${sl.doctorSlug}`} value={`${sl.time}|${sl.doctorSlug}`}>
                      {formatTime(sl.time)}
                      {multiDoctor ? ` — ${sl.doctorName}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </FieldBox>
          ) : (
            <FieldBox label={s.preferredTime} htmlFor={id('time')} error={undefined} errId={id('time-err')}>
              <select ref={setRef('time')} id={id('time')} value={draft.time} onChange={(e) => update({ time: e.target.value })} disabled={!draft.date} className={inputCls(false)}>
                <option value="">{draft.date ? s.anyTime : s.pickDateFirst}</option>
                {sessions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FieldBox>
          )}
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots that fill it are ignored. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={id('website')}>{s.honeypot}</label>
        <input id={id('website')} type="text" tabIndex={-1} autoComplete="off" value={draft.honeypot} onChange={(e) => setDraft({ honeypot: e.target.value })} />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            ref={setRef('consent')}
            type="checkbox"
            checked={draft.consent}
            onChange={(e) => update({ consent: e.target.checked }, 'consent')}
            onBlur={() => onBlur('consent')}
            aria-invalid={!!err('consent')}
            aria-describedby={describe('consent')}
            aria-required="true"
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            {config.consentText}{' '}
            <a href={config.privacyHref} target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-2">
              {s.privacy}
            </a>
          </span>
        </label>
        {err('consent') && (
          <p id={id('consent-err')} className="mt-1.5 text-sm font-medium text-danger">
            {err('consent')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={submitting} aria-disabled={submitting} className={cn(buttonClass(service.mode === 'whatsapp' ? 'whatsapp' : 'primary', 'lg'), 'w-full disabled:opacity-60 sm:w-auto')}>
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : service.mode === 'whatsapp' ? <WhatsAppIcon /> : null}
          {submitting ? s.sending : submitLabel}
        </button>
        <a href={config.clinic.telHref} className="inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline">
          <Phone className="h-4 w-4" aria-hidden /> {config.clinic.phoneDisplay}
        </a>
      </div>
      <p className="text-xs text-ink-muted">{config.note}</p>
    </form>
  );

  function Success({ result, successRef, onDone }: { result: BookingResult; successRef: React.RefObject<HTMLDivElement>; onDone: () => void }) {
    const booked = result.kind === 'booked' ? result : null;
    const downloadIcs = () => {
      if (!booked) return;
      const ics = buildIcs({
        uid: `${booked.appointmentId}@smsdc`,
        title: fill(s.calendarTitle, { doctor: booked.doctorName }),
        description: `${config.clinic.name}\n${config.clinic.phoneDisplay}`,
        location: config.clinic.address,
        date: booked.date,
        start: booked.time,
        end: booked.endTime ?? addMinutes(booked.time, 30),
      });
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'appointment.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const title = result.kind === 'whatsapp' ? s.successWhatsappTitle : s.successTitle;
    return (
      <div ref={successRef} tabIndex={-1} className="space-y-5 outline-none" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" aria-hidden />
          <div>
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="mt-1 text-ink-muted">
              {result.kind === 'enquiry' ? s.successEnquiry : result.kind === 'whatsapp' ? s.successWhatsapp : booked?.status === 'CONFIRMED' ? s.successConfirmed : s.successPending}
            </p>
          </div>
        </div>
        {booked && (
          <dl className="grid gap-3 rounded-2xl bg-bg p-4 text-sm sm:grid-cols-2">
            <Detail label={s.doctorLabel} value={booked.doctorName} />
            <Detail label={s.dateLabel} value={dateLabel(booked.date)} />
            <Detail label={s.timeLabel} value={`${formatTime(booked.time)}${booked.endTime ? ` – ${formatTime(booked.endTime)}` : ''}`} />
            <Detail label={s.statusLabel} value={booked.status} />
            <div className="sm:col-span-2">
              <Detail label={s.clinicLabel} value={`${booked.branchName ?? config.clinic.name}, ${config.clinic.address}`} />
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-3">
          {booked && (
            <button type="button" onClick={downloadIcs} className={buttonClass('outline', 'md')}>
              <CalendarPlus className="h-4 w-4" aria-hidden /> {s.addToCalendar}
            </button>
          )}
          {result.kind === 'whatsapp' && (
            <a href={result.href} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsapp', 'md')}>
              <WhatsAppIcon className="h-4 w-4" /> {s.openWhatsappAgain}
            </a>
          )}
          <a href={config.clinic.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'md')}>
            <MapPin className="h-4 w-4" aria-hidden /> {s.directions}
          </a>
          <button type="button" onClick={onDone} className={buttonClass('primary', 'md')}>
            {s.done}
          </button>
        </div>
      </div>
    );
  }
}

function FieldBox({ label, htmlFor, error, errId, required, reqLabel, children }: { label: string; htmlFor: string; error?: string; errId: string; required?: boolean; reqLabel?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-heading text-sm font-semibold">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> ({reqLabel})</span>}
      </label>
      {children}
      {error && (
        <p id={errId} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-heading font-semibold">{value}</dd>
    </div>
  );
}

function inputCls(invalid: boolean, extra = '') {
  return cn(
    'mt-2 block min-h-[48px] w-full rounded-xl border bg-surface px-4 text-base outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-muted',
    invalid ? 'border-danger focus:ring-danger/30' : 'border-line focus:border-primary focus:ring-primary/30',
    extra,
  );
}

const prettyRange = (v: string) => {
  const [a, b] = v.split('-');
  return b ? `${formatTime(a)} – ${formatTime(b)}` : v;
};

function addMinutes(hhmm: string, m: number) {
  const [h, mm] = hhmm.split(':').map(Number);
  const t = h * 60 + mm + m;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
