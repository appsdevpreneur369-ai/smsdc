// Pure rules for the auto-opening booking popup (unit-tested).

export type PopupConfig = {
  enabled: boolean;
  delaySeconds: number;
  oncePerSession: boolean;
  showOnMobile: boolean;
  excludedPaths: string[];
};

/** What happened this browsing session (sessionStorage). Any of these stops the auto-open. */
export type PopupSessionState = 'closed' | 'opened' | 'booked' | null;

/** Strip the language prefix (/te) so excluded paths apply to every language. */
export function barePath(pathname: string): string {
  const m = pathname.match(/^\/(en|te)(\/.*)?$/);
  const p = m ? m[2] || '/' : pathname;
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

export function isExcludedPath(pathname: string, excluded: string[]): boolean {
  const p = barePath(pathname);
  return excluded.some((e) => p === e || p.startsWith(`${e}/`));
}

export type AutoOpenInput = {
  config: PopupConfig;
  pathname: string;
  isMobile: boolean;
  sessionState: PopupSessionState;
  /** Already shown/closed during this page's lifetime (applies even when oncePerSession is false). */
  shownThisPage: boolean;
};

/** Whether the popup may be scheduled to auto-open on this page. The delay itself is handled by the caller. */
export function canAutoOpen({ config, pathname, isMobile, sessionState, shownThisPage }: AutoOpenInput): boolean {
  if (!config.enabled) return false;
  if (shownThisPage) return false;
  if (isExcludedPath(pathname, config.excludedPaths)) return false;
  if (isMobile && !config.showOnMobile) return false;
  if (config.oncePerSession && sessionState !== null) return false;
  if (sessionState === 'booked') return false;
  return true;
}

export const autoOpenDelayMs = (config: PopupConfig) => Math.max(1, config.delaySeconds) * 1000;
