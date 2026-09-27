'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { buttonClass } from '@/components/ui/primitives-client';
import { FieldBox, inputCls } from '@/components/booking/fields';
import { cn } from '@/lib/cn';
import { BookingError } from '@/lib/booking/api';
import { isValidEmail, isValidFullName, normalizeIndianMobile } from '@/lib/booking/validation';
import { useAccount } from './AccountProvider';

export type AuthView = 'signin' | 'signup' | 'forgot';
type Strings = Record<string, string>;

const MIN_PASSWORD = 8; // ClinicFlow RegisterRequest: 8–128
const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '');

/** Error text for account calls (sign in, sign up, reset, and signed-in API calls). */
export function accountErrorText(e: unknown, a: Strings, f: Strings): string {
  if (e instanceof BookingError) {
    switch (e.kind) {
      case 'badCredentials':
        return a.errBadCredentials;
      case 'emailTaken':
        return a.errEmailTaken;
      case 'accountDisabled':
        return a.errDisabled;
      case 'notPatient':
        return a.errNotPatient;
      case 'unauthorized':
        return a.errExpired;
      case 'network':
        return f.errNetwork;
      case 'rateLimit':
        return f.errRateLimit;
      case 'server':
      case 'invalidResponse':
        return f.errServer;
      default:
        return fill(f.errRequest, {
          msg: e.message && e.message !== e.kind ? e.message : f.errServer,
        });
    }
  }
  return f.errServer;
}

/**
 * Sign in / create account / forgot password for patients (ClinicFlow accounts).
 * Its own <form>, so it must be rendered outside any other form.
 */
export function AuthPanel({
  a,
  f,
  consentText,
  privacyHref,
  initialView = 'signin',
  prefill,
  onSignedIn,
  headingLevel = 'h3',
}: {
  a: Strings;
  f: Strings;
  consentText: string;
  privacyHref: string;
  initialView?: AuthView;
  prefill?: { fullName?: string; phone?: string; email?: string };
  onSignedIn?: () => void;
  headingLevel?: 'h2' | 'h3';
}) {
  const { api } = useAccount();
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [view, setView] = useState<AuthView>(initialView);
  const [fullName, setFullName] = useState(prefill?.fullName ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{
    kind: 'error' | 'info';
    text: string;
  } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);

  // Moving between sign in / sign up / reset: clear messages and put focus on the first field.
  useEffect(() => {
    setErrors({});
    setBanner(null);
    setPassword('');
    if (didMount.current) firstRef.current?.focus();
    didMount.current = true;
  }, [view]);

  useEffect(() => {
    if (banner?.kind === 'error') bannerRef.current?.focus();
  }, [banner]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (view === 'signup') {
      if (!fullName.trim()) e.fullName = f.required;
      else if (!isValidFullName(fullName)) e.fullName = f.nameInvalid;
      if (!phone.trim()) e.phone = f.required;
      else if (!normalizeIndianMobile(phone)) e.phone = f.phoneInvalid;
      if (!consent) e.consent = f.consentRequired;
    }
    if (!email.trim()) e.email = f.required;
    else if (!isValidEmail(email)) e.email = f.emailInvalid;
    if (view !== 'forgot') {
      if (!password) e.password = f.required;
      else if (view === 'signup' && password.length < MIN_PASSWORD) e.password = a.passwordShort;
    }
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    const first = ['fullName', 'phone', 'email', 'password', 'consent'].find((k) => e[k]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      if (view === 'forgot') {
        await api.forgotPassword(email);
        setBanner({
          kind: 'info',
          text: fill(a.forgotSent, { email: email.trim() }),
        });
        return;
      }
      if (view === 'signup')
        await api.register({
          fullName,
          phone: normalizeIndianMobile(phone) ?? '',
          email,
          password,
        });
      else await api.login(email, password);
      setPassword('');
      onSignedIn?.();
    } catch (err) {
      setBanner({ kind: 'error', text: accountErrorText(err, a, f) });
    } finally {
      setBusy(false);
    }
  };

  const H = headingLevel;
  const title = view === 'signup' ? a.signUpTitle : view === 'forgot' ? a.forgotTitle : a.signInTitle;
  const err = (k: string) => errors[k];
  const described = (k: string) => (errors[k] ? id(`${k}-err`) : undefined);
  const link = 'min-h-[44px] font-semibold text-primary underline-offset-2 hover:underline';

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-line bg-bg/60 p-4 sm:p-5" aria-labelledby={id('title')} data-auth-view={view}>
      <div>
        <H id={id('title')} className="text-lg font-bold">
          {title}
        </H>
        {view === 'signup' && <p className="mt-0.5 text-sm text-ink-muted">{a.signUpHelp}</p>}
        {view === 'forgot' && <p className="mt-0.5 text-sm text-ink-muted">{a.forgotHelp}</p>}
      </div>

      {banner && (
        <div
          ref={bannerRef}
          tabIndex={-1}
          role={banner.kind === 'error' ? 'alert' : 'status'}
          className={cn('flex gap-2 rounded-xl border p-3 text-sm font-medium outline-none', banner.kind === 'error' ? 'border-danger/30 bg-danger/5' : 'border-primary/20 bg-secondary-soft')}
        >
          {banner.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
          {banner.text}
        </div>
      )}

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {view === 'signup' && (
          <>
            <FieldBox label={f.name} htmlFor={id('fullName')} error={err('fullName')} errId={id('fullName-err')} required reqLabel={f.requiredMark}>
              <input
                ref={firstRef}
                id={id('fullName')}
                type="text"
                autoComplete="name"
                placeholder={f.namePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={!!err('fullName')}
                aria-describedby={described('fullName')}
                aria-required="true"
                className={inputCls(!!err('fullName'))}
              />
            </FieldBox>
            <FieldBox label={f.phone} htmlFor={id('phone')} error={err('phone')} errId={id('phone-err')} required reqLabel={f.requiredMark}>
              <div
                className={cn(
                  'mt-2 flex items-stretch overflow-hidden rounded-xl border bg-surface focus-within:ring-2',
                  err('phone') ? 'border-danger focus-within:ring-danger/30' : 'border-line focus-within:border-primary focus-within:ring-primary/30',
                )}
              >
                <span className="flex items-center border-r border-line bg-bg px-3 font-medium text-ink-muted" aria-hidden>
                  +91
                </span>
                <input
                  id={id('phone')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={f.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!err('phone')}
                  aria-describedby={described('phone')}
                  aria-required="true"
                  className="min-h-[48px] w-full min-w-0 bg-transparent px-3 text-base outline-none"
                />
              </div>
            </FieldBox>
          </>
        )}

        <div className={cn(view === 'forgot' && 'sm:col-span-2')}>
          <FieldBox label={f.email} htmlFor={id('email')} error={err('email')} errId={id('email-err')} required reqLabel={f.requiredMark}>
            <input
              ref={view === 'signup' ? undefined : firstRef}
              id={id('email')}
              type="email"
              autoComplete={view === 'signup' ? 'email' : 'username'}
              inputMode="email"
              placeholder={f.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err('email')}
              aria-describedby={described('email')}
              aria-required="true"
              className={inputCls(!!err('email'))}
            />
          </FieldBox>
        </div>

        {view !== 'forgot' && (
          <FieldBox label={a.password} htmlFor={id('password')} error={err('password')} errId={id('password-err')} required reqLabel={f.requiredMark}>
            <div
              className={cn(
                'mt-2 flex items-stretch overflow-hidden rounded-xl border bg-surface focus-within:ring-2',
                err('password') ? 'border-danger focus-within:ring-danger/30' : 'border-line focus-within:border-primary focus-within:ring-primary/30',
              )}
            >
              <input
                id={id('password')}
                type={showPw ? 'text' : 'password'}
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!err('password')}
                aria-describedby={[described('password'), view === 'signup' ? id('pw-hint') : ''].filter(Boolean).join(' ') || undefined}
                aria-required="true"
                className="min-h-[48px] w-full min-w-0 bg-transparent px-4 text-base outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? a.hidePassword : a.showPassword}
                aria-pressed={showPw}
                className="flex w-12 shrink-0 items-center justify-center text-ink-muted hover:text-primary"
              >
                {showPw ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
              </button>
            </div>
            {view === 'signup' && !err('password') && (
              <p id={id('pw-hint')} className="mt-1.5 text-xs text-ink-muted">
                {a.passwordHint}
              </p>
            )}
          </FieldBox>
        )}
      </div>

      {view === 'signup' && (
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              id={id('consent')}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!err('consent')}
              aria-describedby={described('consent')}
              aria-required="true"
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              {consentText}{' '}
              <a href={privacyHref} target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-2">
                {f.privacy}
              </a>
            </span>
          </label>
          {err('consent') && (
            <p id={id('consent-err')} className="mt-1.5 text-sm font-medium text-danger">
              {err('consent')}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
        <button type="submit" disabled={busy} className={cn(buttonClass('primary', 'md'), 'w-full disabled:opacity-60 sm:w-auto')}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? (view === 'signup' ? a.creating : view === 'forgot' ? f.sending : a.signingIn) : view === 'signup' ? a.signUp : view === 'forgot' ? a.forgotSend : a.signIn}
        </button>
        {view === 'signin' && (
          <button type="button" className={cn(link, 'text-sm')} onClick={() => setView('forgot')}>
            {a.forgot}
          </button>
        )}
      </div>

      <p className="text-sm text-ink-muted">
        {view === 'signin' ? (
          <>
            {a.noAccount}{' '}
            <button type="button" className={link} onClick={() => setView('signup')}>
              {a.signUp}
            </button>
          </>
        ) : view === 'signup' ? (
          <>
            {a.haveAccount}{' '}
            <button type="button" className={link} onClick={() => setView('signin')}>
              {a.signIn}
            </button>
          </>
        ) : (
          <button type="button" className={link} onClick={() => setView('signin')}>
            {a.backToSignIn}
          </button>
        )}
      </p>
    </form>
  );
}
