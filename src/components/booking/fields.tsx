import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Shared form building blocks for the booking and account forms.

export function FieldBox({ label, htmlFor, error, errId, required, reqLabel, children }: { label: string; htmlFor: string; error?: string; errId: string; required?: boolean; reqLabel?: string; children: ReactNode }) {
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

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-heading font-semibold">{value}</dd>
    </div>
  );
}

export function inputCls(invalid: boolean, extra = '') {
  return cn(
    'mt-2 block min-h-[48px] w-full rounded-xl border bg-surface px-4 text-base outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-muted',
    invalid ? 'border-danger focus:ring-danger/30' : 'border-line focus:border-primary focus:ring-primary/30',
    extra,
  );
}
