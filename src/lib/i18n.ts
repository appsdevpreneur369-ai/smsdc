import en from '@content/i18n/en.json';
import te from '@content/i18n/te.json';
import type { Loc } from './content/schemas';

export const locales = ['en', 'te'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'en';
export const isLang = (v: string): v is Lang => (locales as readonly string[]).includes(v);

const dictionaries = { en, te } as const;
export type Dict = typeof en;
export const getDict = (lang: Lang): Dict => dictionaries[lang] as Dict;

export type Vars = Record<string, string | number>;

/** Replace {{name}} tokens. Unknown tokens are left visible so they get noticed. */
export function fill(text: string, vars: Vars = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Pick the right language from a Loc, falling back to English. */
export function tx(value: Loc | undefined | null, lang: Lang, vars?: Vars): string {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : (lang === 'te' && value.te) || value.en;
  return vars ? fill(s, vars) : s;
}

/** True when the Telugu page has to show English for this value. */
export const isFallback = (value: Loc | undefined, lang: Lang) =>
  lang === 'te' && value != null && (typeof value === 'string' || !value.te);

/** Look up a UI string by dotted key, e.g. t(dict, 'nav.home'). Falls back to English, then the key. */
export function t(dict: Dict, key: string, vars?: Vars): string {
  const get = (d: unknown) =>
    key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), d);
  const v = get(dict) ?? get(en);
  return typeof v === 'string' ? fill(v, vars) : key;
}

/** Prefix an internal path for the language. English lives at the root; Telugu under /te. */
export function localePath(lang: Lang, href: string): string {
  if (!href.startsWith('/')) return href;
  if (lang === defaultLang) return href;
  return href === '/' ? `/${lang}` : `/${lang}${href}`;
}

/** Strip the language prefix from a pathname. */
export function stripLang(pathname: string): string {
  const m = pathname.match(/^\/(en|te)(\/.*)?$/);
  return m ? m[2] || '/' : pathname;
}
