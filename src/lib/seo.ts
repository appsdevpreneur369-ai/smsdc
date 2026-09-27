import type { Metadata } from 'next';
import { clinic, siteUrl } from './content';
import { localePath, tx, type Lang } from './i18n';

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
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: { 'en-IN': localePath('en', path), 'te-IN': localePath('te', path), 'x-default': localePath('en', path) },
    },
    openGraph: {
      type,
      url,
      siteName,
      title: absoluteTitle ? title : `${title} | ${siteName}`,
      description,
      locale: lang === 'te' ? 'te_IN' : 'en_IN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export const absoluteUrl = (path: string) => `${siteUrl}${path === '/' ? '' : path}`;
