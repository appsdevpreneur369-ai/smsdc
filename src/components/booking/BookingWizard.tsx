'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock, ExternalLink, Phone, RotateCcw } from 'lucide-react';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import { buttonClass } from '@/components/ui/primitives-client';
import { cn } from '@/lib/cn';

export type WizardProblem = { id: string; icon: string; label: string; hint: string; doctors: string[]; any: boolean };
export type WizardDoctor = {
  slug: string;
  name: string;
  qualification: string;
  speciality: string;
  consult: string[];
  days: string[];
  profileHref: string;
  clinicflowId: string | null;
  avatar: ReactNode;
};
export type WizardConfig = {
  mode: 'clinicflow' | 'whatsapp';
  clinicflowUrl: string;
  clinicflowDoctorParam: string | null;
  allowDirect: boolean;
  defaultDoctor: string;
  whatsappNumber: string;
  messageTemplate: string;
  clinicName: string;
  telHref: string;
  phoneDisplay: string;
  note: string;
};
export type WizardStrings = Record<
  | 'stepLabel' | 'step1' | 'step1Help' | 'step2' | 'step2Help' | 'step2HelpSingle' | 'anyAvailable' | 'consultsOn'
  | 'step3' | 'step3Help' | 'step3HelpClinicflow' | 'name' | 'namePlaceholder' | 'day' | 'dayAny' | 'sendWhatsapp'
  | 'chooseSlot' | 'selectDoctorNext' | 'orCall' | 'summary' | 'concern' | 'change' | 'required' | 'restart'
  | 'back' | 'next' | 'doctor' | 'consultation' | 'viewProfile',
  string
>;

const ANY = '__any__';
const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

export function BookingWizard({
  problems,
  doctors,
  config,
  strings: s,
}: {
  problems: WizardProblem[];
  doctors: WizardDoctor[];
  config: WizardConfig;
  strings: WizardStrings;
}) {
  const params = useSearchParams();
  const byslug = useMemo(() => Object.fromEntries(doctors.map((d) => [d.slug, d])), [doctors]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Deep links: /book?problem=<id> or /book?doctor=<slug>
  useEffect(() => {
    const p = params.get('problem');
    const d = params.get('doctor');
    if (p && problems.some((x) => x.id === p)) {
      setProblemId(p);
      setStep(2);
    } else if (d && byslug[d]) {
      setDoctor(config.allowDirect ? d : config.defaultDoctor);
      setStep(2);
    }
  }, [params, problems, byslug, config.allowDirect, config.defaultDoctor]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const problem = problems.find((p) => p.id === problemId) ?? null;

  // Doctors offered at step 2.
  const recommended: string[] = useMemo(() => {
    if (!config.allowDirect) return [config.defaultDoctor];
    if (problem) return problem.doctors;
    if (doctor) return [doctor];
    return [config.defaultDoctor];
  }, [problem, doctor, config.allowDirect, config.defaultDoctor]);
  const offerAny = !!problem?.any && recommended.length > 1 && config.allowDirect;

  // Default selection when entering step 2.
  useEffect(() => {
    if (step !== 2) return;
    if (doctor && (recommended.includes(doctor) || doctor === ANY)) return;
    setDoctor(offerAny ? ANY : recommended[0]);
  }, [step, recommended, offerAny, doctor]);

  const chosen = doctor && doctor !== ANY ? byslug[doctor] : null;
  const doctorLabel = doctor === ANY ? recommended.map((x) => byslug[x]?.name).join(' / ') : chosen?.name ?? '';
  const concern = problem?.label ?? s.consultation;
  const days = chosen ? chosen.days : doctor === ANY ? byslug[recommended[0]]?.days ?? [] : [];

  const pick = (id: string) => {
    setProblemId(id);
    setDoctor(null);
    setStep(2);
  };

  const whatsappHref = () => {
    const msg = fill(config.messageTemplate, {
      clinic: config.clinicName,
      name: name.trim(),
      problem: concern,
      doctor: doctor === ANY ? `${doctorLabel} (${s.anyAvailable})` : doctorLabel,
      day: day || s.dayAny,
    });
    return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  const clinicflowHref = () => {
    const url = new URL(config.clinicflowUrl);
    if (config.clinicflowDoctorParam && chosen?.clinicflowId) url.searchParams.set(config.clinicflowDoctorParam, chosen.clinicflowId);
    return url.toString();
  };
  const clinicflowPreselects = !!(config.clinicflowDoctorParam && chosen?.clinicflowId);

  const submitWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(s.required);
      return;
    }
    setError('');
    window.open(whatsappHref(), '_blank', 'noopener,noreferrer');
  };

  const restart = () => {
    setStep(1);
    setProblemId(null);
    setDoctor(null);
    setDay('');
  };

  const title = step === 1 ? s.step1 : step === 2 ? s.step2 : s.step3;

  return (
    <div className="rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:p-8 lg:p-10">
      {/* Progress */}
      <ol className="flex items-center gap-2" aria-label={fill(s.stepLabel, { n: String(step) })}>
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold transition-colors',
                n < step ? 'bg-primary text-white' : n === step ? 'bg-accent text-dark' : 'bg-bg text-ink-muted ring-1 ring-line',
              )}
              aria-current={n === step ? 'step' : undefined}
            >
              {n < step ? <Check className="h-4 w-4" aria-hidden /> : n}
            </span>
            {n < 3 && <span className={cn('h-1 flex-1 rounded-full', n < step ? 'bg-primary' : 'bg-line')} aria-hidden />}
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary" aria-live="polite">
        {fill(s.stepLabel, { n: String(step) })}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-32 text-2xl font-bold outline-none sm:text-3xl">
        {title}
      </h2>

      {/* Step 1 — problem picker */}
      {step === 1 && (
        <>
          <p className="mt-2 text-ink-muted">{s.step1Help}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {problems.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  className={cn(
                    'group flex h-full min-h-[76px] w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft',
                    problemId === p.id ? 'border-primary bg-secondary-soft' : 'border-line bg-surface',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-primary group-hover:bg-primary group-hover:text-white">
                    <Icon name={p.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading font-semibold leading-snug">{p.label}</span>
                    <span className="block text-sm text-ink-muted">{p.hint}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Step 2 — recommended doctor(s) */}
      {step === 2 && (
        <>
          <p className="mt-2 text-ink-muted">{config.allowDirect ? s.step2Help : s.step2HelpSingle}</p>
          <p className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-bg px-4 py-2 text-sm">
            <span className="font-semibold">{s.concern}:</span> {concern}
            <button type="button" onClick={() => setStep(1)} className="min-h-[32px] font-semibold text-primary underline underline-offset-2">
              {s.change}
            </button>
          </p>
          <fieldset className="mt-6">
            <legend className="sr-only">{s.doctor}</legend>
            <div className="grid gap-3">
              {offerAny && (
                <DoctorOption checked={doctor === ANY} onSelect={() => setDoctor(ANY)} title={s.anyAvailable} subtitle={recommended.map((x) => byslug[x]?.name).join(' · ')} />
              )}
              {recommended.map((slug) => {
                const d = byslug[slug];
                if (!d) return null;
                return (
                  <DoctorOption
                    key={slug}
                    checked={doctor === slug}
                    onSelect={() => setDoctor(slug)}
                    avatar={d.avatar}
                    title={`${d.name}, ${d.qualification}`}
                    subtitle={d.speciality}
                    extra={
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-primary" aria-hidden />
                          {s.consultsOn}: {d.consult.join('; ')}
                        </span>
                        <Link href={d.profileHref} className="font-semibold text-primary underline underline-offset-2" target="_blank">
                          {s.viewProfile}
                        </Link>
                      </span>
                    }
                  />
                );
              })}
            </div>
          </fieldset>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(1)} className={buttonClass('ghost')}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> {s.back}
            </button>
            <button type="button" onClick={() => setStep(3)} disabled={!doctor} className={cn(buttonClass('primary', 'lg'), 'disabled:opacity-50')}>
              {s.next} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </>
      )}

      {/* Step 3 — hand-off */}
      {step === 3 && (
        <>
          <p className="mt-2 text-ink-muted">{config.mode === 'clinicflow' ? s.step3HelpClinicflow : s.step3Help}</p>

          <dl className="mt-6 grid gap-3 rounded-2xl bg-bg p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink-muted">{s.concern}</dt>
              <dd className="font-heading font-semibold">{concern}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">{s.doctor}</dt>
              <dd className="font-heading font-semibold">{doctorLabel}</dd>
            </div>
          </dl>

          {config.mode === 'whatsapp' ? (
            <form onSubmit={submitWhatsapp} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="bk-name" className="block font-heading text-sm font-semibold">
                  {s.name} <span aria-hidden className="text-danger">*</span>
                </label>
                <input
                  id="bk-name"
                  type="text"
                  autoComplete="given-name"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'bk-name-err' : undefined}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={s.namePlaceholder}
                  className="mt-2 block min-h-[48px] w-full rounded-xl border border-line bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {error && (
                  <p id="bk-name-err" className="mt-1.5 text-sm font-medium text-danger">
                    {error}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="bk-day" className="block font-heading text-sm font-semibold">
                  {s.day}
                </label>
                <select
                  id="bk-day"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="mt-2 block min-h-[48px] w-full rounded-xl border border-line bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{s.dayAny}</option>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                <button type="submit" className={cn(buttonClass('whatsapp', 'lg'), 'flex-1')}>
                  <WhatsAppIcon /> {s.sendWhatsapp}
                </button>
                <a href={config.telHref} className={cn(buttonClass('outline', 'lg'), 'flex-1')}>
                  <Phone className="h-4 w-4" aria-hidden /> {s.orCall}
                </a>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              {!clinicflowPreselects && doctorLabel && (
                <p className="rounded-2xl border border-accent/60 bg-accent/10 p-4 text-sm font-medium">{fill(s.selectDoctorNext, { doctor: doctorLabel })}</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={clinicflowHref()} target="_blank" rel="noopener noreferrer" className={cn(buttonClass('primary', 'lg'), 'flex-1')}>
                  <CalendarCheck className="h-5 w-5" aria-hidden /> {s.chooseSlot} <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
                <a href={config.telHref} className={cn(buttonClass('outline', 'lg'), 'flex-1')}>
                  <Phone className="h-4 w-4" aria-hidden /> {s.orCall}
                </a>
              </div>
            </div>
          )}

          <p className="mt-6 text-sm text-ink-muted">{config.note}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(2)} className={buttonClass('ghost', 'sm')}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> {s.back}
            </button>
            <button type="button" onClick={restart} className={buttonClass('ghost', 'sm')}>
              <RotateCcw className="h-4 w-4" aria-hidden /> {s.restart}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DoctorOption({
  checked,
  onSelect,
  title,
  subtitle,
  avatar,
  extra,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  avatar?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
        checked ? 'border-primary bg-secondary-soft/60 shadow-soft' : 'border-line hover:border-primary/60',
      )}
    >
      <input type="radio" name="doctor" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        className={cn('mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-primary bg-primary text-white' : 'border-line')}
        aria-hidden
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      {avatar && <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">{avatar}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-heading font-semibold">{title}</span>
        <span className="block text-sm text-ink-muted">{subtitle}</span>
        {extra}
      </span>
    </label>
  );
}
