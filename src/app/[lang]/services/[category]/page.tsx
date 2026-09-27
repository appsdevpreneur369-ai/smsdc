import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, HandCoins, Stethoscope, Users } from 'lucide-react';
import { categories, getCategory, getDoctor, services } from '@/lib/content';
import { getDict, locales, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { faqJsonLd } from '@/lib/jsonld';
import { PageHeader } from '@/components/layout/PageHeader';
import { ServiceCard } from '@/components/cards';
import { Avatar } from '@/components/ui/Avatar';
import { Accordion } from '@/components/ui/Accordion';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink, ContentImage, DraftBadge, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/Reveal';
import { JsonLd } from '@/components/seo/JsonLd';
import { CtaBanner } from '@/components/sections/home';

type Params = { lang: Lang; category: string };

export function generateStaticParams() {
  return locales.flatMap((lang) => categories.map((c) => ({ lang, category: c.slug })));
}

export function generateMetadata({ params }: { params: Params }) {
  const c = getCategory(params.category);
  if (!c) return {};
  return pageMetadata({
    lang: params.lang,
    path: `/services/${c.slug}`,
    title: tx(c.title, params.lang),
    description: `${tx(c.summary, params.lang)} ${tx(services.pricingNote, params.lang)}`,
  });
}

export default function CategoryPage({ params: { lang, category } }: { params: Params }) {
  const c = getCategory(category);
  if (!c) notFound();
  const dict = getDict(lang);
  const title = tx(c.title, lang);
  const lead = c.doctors.map(getDoctor);
  const bookHref = `/book?treatment=${c.slug}`;
  const faqItems = c.faqs.map((f) => ({ q: tx(f.q, lang), a: tx(f.a, lang) }));

  return (
    <>
      <PageHeader
        lang={lang}
        crumbs={[
          { name: t(dict, 'nav.services'), path: '/services' },
          { name: title, path: `/services/${c.slug}` },
        ]}
        heading={title}
        intro={tx(c.intro, lang)}
        aside={
          <div className="relative hidden overflow-hidden rounded-[2rem] shadow-lift lg:block">
            <ContentImage id={c.image} lang={lang} priority className="h-auto w-full" sizes="480px" />
          </div>
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-dark">
            <Icon name={c.icon} className="h-6 w-6" />
          </span>
          <DraftBadge status={c.status} lang={lang} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={bookHref} lang={lang} size="lg">
            {t(dict, 'cta.book')}
          </ButtonLink>
          <ButtonLink href="@whatsapp" lang={lang} size="lg" variant="outline">
            {t(dict, 'cta.whatsappUs')}
          </ButtonLink>
        </div>
      </PageHeader>

      <section className="section" aria-labelledby="sub-heading">
        <div className="container grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 id="sub-heading" className="text-2xl font-bold sm:text-3xl">
              {t(dict, 'services.subTreatments')}
            </h2>
            <ol className="mt-8 space-y-5">
              {c.subTreatments.map((s, i) => {
                const docs = (s.doctors ?? c.doctors).map(getDoctor);
                return (
                  <Reveal as="li" key={s.slug} delay={Math.min(i, 3) * 0.05}>
                    <article id={s.slug} className="scroll-mt-28 rounded-brand border border-line bg-surface p-6 shadow-soft sm:p-7">
                      <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-soft font-heading font-bold text-primary-dark">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold">{tx(s.title, lang)}</h3>
                          <p className="mt-2 leading-relaxed text-ink-muted">{tx(s.description, lang)}</p>
                          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl bg-bg p-4">
                              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                <Users className="h-4 w-4 text-primary" aria-hidden />
                                {t(dict, 'common.whoFor')}
                              </dt>
                              <dd className="mt-1.5 text-sm">{tx(s.whoFor, lang)}</dd>
                            </div>
                            <div className="rounded-2xl bg-bg p-4">
                              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
                                {t(dict, 'common.sittings')}
                              </dt>
                              <dd className="mt-1.5 text-sm">{tx(s.sittings, lang)}</dd>
                            </div>
                            <div className="rounded-2xl bg-bg p-4">
                              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                <Stethoscope className="h-4 w-4 text-primary" aria-hidden />
                                {t(dict, 'common.treatedBy')}
                              </dt>
                              <dd className="mt-0.5 text-sm">
                                {docs.map((d) => (
                                  <Link key={d.slug} href={localePath(lang, `/doctors/${d.slug}`)} className="flex min-h-[44px] items-center font-semibold text-primary hover:underline">
                                    {d.displayName}
                                  </Link>
                                ))}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </ol>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-brand border border-line bg-surface p-6 shadow-soft">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-ink-muted">{t(dict, 'services.leadBy')}</h2>
              <ul className="mt-4 space-y-3">
                {lead.map((d) => (
                  <li key={d.slug}>
                    <Link href={localePath(lang, `/doctors/${d.slug}`)} className="group flex items-center gap-3 rounded-2xl p-2 hover:bg-secondary-soft">
                      <Avatar doctor={d} size="sm" className="h-12 w-12 shrink-0 rounded-xl" />
                      <span>
                        <span className="block font-heading font-semibold group-hover:text-primary">{d.displayName}</span>
                        <span className="block text-sm text-ink-muted">{tx(d.shortSpeciality, lang)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="on-dark rounded-brand bg-dark p-6 text-on-dark-muted">
              <HandCoins className="h-7 w-7 text-accent" aria-hidden />
              <h2 className="mt-3 font-heading text-lg font-semibold text-white">{t(dict, 'services.pricing')}</h2>
              <p className="mt-2">{tx(services.pricingNote, lang)}</p>
              <ButtonLink href={bookHref} lang={lang} variant="gold" className="mt-5 w-full">
                {t(dict, 'cta.book')}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>

      {faqItems.length > 0 && (
        <section className="section bg-surface" aria-labelledby="cat-faq">
          <div className="container max-w-3xl">
            <SectionHeading id="cat-faq" eyebrow={title} heading={t(dict, 'common.faqs')} />
            <Accordion items={faqItems} className="mt-10" />
          </div>
          <JsonLd data={faqJsonLd(c.faqs, lang)} />
        </section>
      )}

      <section className="section" aria-labelledby="other-cats">
        <div className="container">
          <SectionHeading id="other-cats" heading={t(dict, 'services.otherCategories')} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3]
              .map((k) => categories[(categories.indexOf(c) + k) % categories.length])
              .map((x) => (
                <li key={x.slug}>
                  <ServiceCard category={x} lang={lang} />
                </li>
              ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
    </>
  );
}
