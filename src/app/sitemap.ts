import type { MetadataRoute } from 'next';
import { categories, doctors } from '@/lib/content';
import { getArticles, getLegalPages } from '@/lib/content/markdown';
import { localePath, locales } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';

/** Generated from content: every page in both languages, with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['/', '/about', '/services', '/doctors', '/why-us', '/gallery', '/reviews', '/patient-education', '/faqs', '/book', '/contact', '/emergency'];
  const paths = [
    ...staticPaths,
    ...categories.map((c) => `/services/${c.slug}`),
    ...doctors.map((d) => `/doctors/${d.slug}`),
    ...getArticles().map((a) => `/patient-education/${a.meta.slug}`),
    ...getLegalPages().map((p) => `/${p.meta.slug}`),
  ];
  const priority = (p: string) => (p === '/' ? 1 : p === '/book' || p === '/services' || p === '/contact' ? 0.9 : p.startsWith('/services/') ? 0.8 : 0.6);
  return paths.flatMap((path) =>
    locales.map((lang) => ({
      url: absoluteUrl(localePath(lang, path)),
      changeFrequency: 'monthly' as const,
      priority: lang === 'en' ? priority(path) : Math.max(0.3, priority(path) - 0.2),
      alternates: { languages: { 'en-IN': absoluteUrl(localePath('en', path)), 'te-IN': absoluteUrl(localePath('te', path)) } },
    })),
  );
}
