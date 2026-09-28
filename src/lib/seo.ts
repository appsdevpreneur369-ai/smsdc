import type { Metadata } from 'next';
import { clinic, siteUrl } from './content';
import { localePath, tx, type Lang } from './i18n';

const TITLE_MAX = 60;
/** " | Suhasini Dental, Tadepalle": the layout's title template (see app/[lang]/layout.tsx). */
export const titleSuffix = (lang: Lang) => ` | ${tx(clinic.shortName, lang)}, ${clinic.address.locality}`;

/**
 * Keeps <title> within 60 characters: "Page | Suhasini Dental, Tadepalle" when it fits, else "Page | Suhasini Dental",
 * else the page title alone (shortened at a word).
 */
export function fitTitle(title: string, lang: Lang): { absolute: string } | string {
  if (title.length + titleSuffix(lang).length <= TITLE_MAX) return title;
  const short = `${title} | ${tx(clinic.shortName, lang)}`;
  if (short.length <= TITLE_MAX) return { absolute: short };
  return { absolute: clip(title, TITLE_MAX) };
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

/**
 * Meta description of about 120–160 characters: joins the parts (sentences) while they fit in 160, starting with the
 * first; a first part longer than 160 is shortened at a word.
 */
export function fitDescription(parts: (string | undefined | null)[], max = 160): string {
  const clean = parts.map((p) => (p ?? '').trim()).filter(Boolean);
  let out = clip(clean[0] ?? '', max);
  for (const p of clean.slice(1)) {
    if (`${out} ${p}`.length <= max) out = `${out} ${p}`;
  }
  return out;
}

/** Per-page metadata with canonical URL, hreflang alternates and Open Graph. `path` is the bare (English) path. */
export function pageMetadata({
  lang,
  path,
  title,
  description,
  absoluteTitle,
  image,
  type = 'website',
}: {
  lang: Lang;
  path: string;
  title: string;
  description?: string;
  absoluteTitle?: boolean;
  image?: string;
  type?: 'website' | 'article';
}): Metadata {
  const url = localePath(lang, path);
  const siteName = tx(clinic.displayName, lang);
  const ogImage = image ?? `/og?title=${encodeURIComponent(title)}`;
  const desc = description && fitDescription([description]);
  return {
    title: absoluteTitle ? { absolute: title } : fitTitle(title, lang),
    description: desc,
    alternates: {
      canonical: url,
      languages: { 'en-IN': localePath('en', path), 'te-IN': localePath('te', path), 'x-default': localePath('en', path) },
    },
    openGraph: {
      type,
      url,
      siteName,
      title: absoluteTitle ? title : `${title} | ${siteName}`,
      description: desc,
      locale: lang === 'te' ? 'te_IN' : 'en_IN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [ogImage] },
  };
}

export const absoluteUrl = (path: string) => `${siteUrl}${path === '/' ? '' : path}`;
