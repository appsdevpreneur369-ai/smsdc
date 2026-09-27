// sessionStorage access that never throws (private mode, blocked storage, SSR).
import type { PopupSessionState } from './popupRules';

const KEY = 'smsdc.bookingPopup';

export function readPopupState(): PopupSessionState {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === 'closed' || v === 'opened' || v === 'booked' ? v : null;
  } catch {
    return null;
  }
}

export function writePopupState(v: Exclude<PopupSessionState, null>): void {
  try {
    // 'booked' always wins; don't downgrade it to 'closed'/'opened'.
    if (window.sessionStorage.getItem(KEY) === 'booked' && v !== 'booked') return;
    window.sessionStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable — the in-memory flag still prevents a second auto-open on this page */
  }
}
