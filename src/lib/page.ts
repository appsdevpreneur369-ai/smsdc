import { pages } from './content';
import type { PageKey } from './content/schemas';
import { tx, type Lang } from './i18n';
import { pageMetadata } from './seo';
import { siteVars } from './vars';

/** Standard metadata for a static page described in content/pages.json. */
export function staticPageMetadata(key: PageKey, lang: Lang, path: string) {
  const p = pages[key];
  const vars = siteVars(lang);
  return pageMetadata({ lang, path, title: tx(p.title, lang, vars), description: tx(p.description, lang, vars) });
}

/** Resolved header strings for a static page. */
export function pageHeader(key: PageKey, lang: Lang) {
  const p = pages[key];
  const vars = siteVars(lang);
  return {
    title: tx(p.title, lang, vars),
    eyebrow: tx(p.eyebrow, lang, vars) || undefined,
    heading: tx(p.heading, lang, vars) || tx(p.title, lang, vars),
    intro: tx(p.intro, lang, vars) || undefined,
  };
}
