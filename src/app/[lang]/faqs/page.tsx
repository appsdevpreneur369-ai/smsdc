import Link from 'next/link';
import { categories, faqs } from '@/lib/content';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { faqJsonLd } from '@/lib/jsonld';
import { siteVars } from '@/lib/vars';
import { PageHeader } from '@/components/layout/PageHeader';
import { Accordion } from '@/components/ui/Accordion';
import { Icon } from '@/components/ui/Icon';
import { DraftBadge } from '@/components/ui/primitives';
import { JsonLd } from '@/components/seo/JsonLd';
import { CtaBanner } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('faqs', params.lang, '/faqs');
}

export default function FaqsPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('faqs', lang);
  const dict = getDict(lang);
  const vars = siteVars(lang);
  const general = faqs.faqs.map((f) => ({ q: tx(f.q, lang, vars), a: tx(f.a, lang, vars) }));
  const groups = [
    { id: 'general', title: t(dict, 'faq.general'), icon: 'help', items: general, href: null as string | null },
    ...categories.map((c) => ({
      id: c.slug,
      title: tx(c.title, lang),
      icon: c.icon,
      items: c.faqs.map((f) => ({ q: tx(f.q, lang), a: tx(f.a, lang) })),
      href: localePath(lang, `/services/${c.slug}`),
    })),
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/faqs' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={faqs.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[260px_1fr]">
          <nav aria-label={h.title} className="hidden lg:block">
            <ul className="sticky top-28 space-y-1">
              {groups.map((g) => (
                <li key={g.id}>
                  <a href={`#${g.id}`} className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 font-medium hover:bg-secondary-soft hover:text-primary-dark">
                    <Icon name={g.icon} className="h-4 w-4 text-primary" />
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-14">
            {groups.map((g) => (
              <div key={g.id} id={g.id} className="scroll-mt-28">
                <h2 className="flex items-center gap-3 text-2xl font-bold">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-primary">
                    <Icon name={g.icon} className="h-5 w-5" />
                  </span>
                  {g.href ? (
                    <Link href={g.href} className="inline-flex min-h-[44px] items-center hover:text-primary hover:underline">
                      {g.title}
                    </Link>
                  ) : (
                    g.title
                  )}
                </h2>
                <Accordion items={g.items} defaultOpen={g.id === 'general' ? 0 : null} className="mt-5" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBanner lang={lang} />
      <JsonLd data={faqJsonLd([...faqs.faqs, ...categories.flatMap((c) => c.faqs)], lang, vars)} />
    </>
  );
}
