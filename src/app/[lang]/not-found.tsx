import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowRight } from 'lucide-react';
import { categories, pages } from '@/lib/content';
import { getDict, isLang, localePath, t, tx, type Lang } from '@/lib/i18n';
import { ButtonLink } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';

export default function NotFound() {
  const h = headers().get('x-lang') ?? 'en';
  const lang: Lang = isLang(h) ? h : 'en';
  const dict = getDict(lang);
  const p = pages.notFound;
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" aria-hidden />
      <div className="container relative py-20 text-center sm:py-28">
        <p className="font-heading text-[6rem] font-extrabold leading-none text-primary sm:text-[9rem]" aria-hidden>
          4<span className="inline-block -rotate-12 text-accent">
            <Icon name="tooth" className="inline h-20 w-20 sm:h-32 sm:w-32" strokeWidth={2.2} />
          </span>
          4
        </p>
        <h1 className="mx-auto mt-6 max-w-xl text-3xl font-bold sm:text-4xl">{tx(p.heading, lang)}</h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-muted">{tx(p.intro, lang)}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" lang={lang} size="lg">
            {t(dict, 'notFound.cta')}
          </ButtonLink>
          <ButtonLink href="/book" lang={lang} size="lg" variant="outline">
            {t(dict, 'cta.book')}
          </ButtonLink>
        </div>
        <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={localePath(lang, `/services/${c.slug}`)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-primary hover:text-primary"
              >
                {tx(c.title, lang)} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
