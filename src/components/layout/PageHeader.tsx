import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { getDict, localePath, t, type Lang } from '@/lib/i18n';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/seo/JsonLd';

export type Crumb = { name: string; path: string };

/** Inner-page hero: breadcrumbs, eyebrow, H1, intro, optional extra content (badges, CTAs). */
export function PageHeader({
  lang,
  crumbs,
  eyebrow,
  heading,
  intro,
  children,
  aside,
}: {
  lang: Lang;
  crumbs: Crumb[];
  eyebrow?: string;
  heading: string;
  intro?: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  const dict = getDict(lang);
  const all = [{ name: t(dict, 'nav.home'), path: '/' }, ...crumbs];
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden />
      <div className="dot-grid pointer-events-none absolute bottom-6 right-6 hidden h-28 w-44 opacity-40 md:block" aria-hidden />
      <div className="container relative py-10 sm:py-14 lg:py-16">
        <nav aria-label={t(dict, 'nav.breadcrumb')}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            {all.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
                {i < all.length - 1 ? (
                  <Link href={localePath(lang, c.path)} className="inline-flex min-h-[44px] items-center hover:text-primary">
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-ink">
                    {c.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className={aside ? 'mt-4 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]' : 'mt-4'}>
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{heading}</h1>
            {intro && <p className="mt-5 text-lg leading-relaxed text-ink-muted sm:text-xl">{intro}</p>}
            {children}
          </div>
          {aside}
        </div>
      </div>
      <JsonLd data={breadcrumbJsonLd(all.map((c) => ({ name: c.name, path: localePath(lang, c.path) })))} />
    </section>
  );
}
