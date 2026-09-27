// Signed-in patient session (ClinicFlow JWTs). Kept in sessionStorage, not localStorage: it ends when the
// tab closes, which suits shared devices at a clinic front desk. Never logged, never put in a URL.
export type PatientSession = {
  accessToken: string;
  refreshToken: string;
  /** epoch ms when the access token expires (refreshed shortly before, and again on any 401) */
  expiresAt: number;
  user: { id: string; email: string; firstName: string; lastName: string };
};

const KEY = 'smsdc.patientSession';
export const SESSION_EVENT = 'smsdc:session';

export function readSession(): PatientSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PatientSession;
    return s && typeof s.accessToken === 'string' && typeof s.refreshToken === 'string' && s.user ? s : null;
  } catch {
    return null;
  }
}

export function writeSession(s: PatientSession | null): void {
  try {
    if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode etc.): nothing persists; the patient signs in again on the next page
  }
  try {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT));
  } catch {
    /* not in a browser */
  }
}

/** Display name for greetings; a "." last name is the placeholder for one-word names (see splitFullName). */
export const sessionDisplayName = (s: PatientSession) => [s.user.firstName, s.user.lastName === '.' ? '' : s.user.lastName].filter(Boolean).join(' ');
