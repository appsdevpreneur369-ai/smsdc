// Pure form helpers — no content imports (used by client components and unit tests).

/**
 * Normalise an Indian mobile number to 10 digits, or null if invalid.
 * Accepts spaces/dashes and a +91, 91 or 0 prefix. Valid numbers start with 6–9 (same rule as the API).
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = (input || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Display a verified number with only the last 4 digits visible: "+91 XXXXX X1629". */
export function maskIndianMobile(tenDigits: string): string {
  return `+91 XXXXX X${tenDigits.slice(-4)}`;
}

export function isValidEmail(input: string): boolean {
  const v = (input || '').trim();
  if (v.length < 6 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) && !/\.\./.test(v) && /\.[A-Za-z]{2,}$/.test(v);
}

export function isValidFullName(input: string): boolean {
  const v = (input || '').trim().replace(/\s+/g, ' ');
  return v.length >= 2 && v.length <= 120 && /\p{L}/u.test(v);
}

/**
 * ClinicFlow's guest booking requires firstName and lastName. Many Indian names are a single word, so
 * a one-word name is sent with lastName "." (see SMSDC_PendingItems.md — core should make lastName optional).
 */
export function splitFullName(input: string): { firstName: string; lastName: string } {
  const parts = (input || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '.' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

export const isSixDigitOtp = (v: string) => /^\d{6}$/.test((v || '').trim());
