import Link from 'next/link';
import { ArrowRight, CheckCircle2, ExternalLink, Star } from 'lucide-react';
import { categories, clinic, doctors, faqs, home, reviews, routing, whyUs } from '@/lib/content';
import { getArticles } from '@/lib/content/markdown';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { siteVars } from '@/lib/vars';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink, ContentImage, DraftBadge, SectionHeading, buttonClass } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { Carousel } from '@/components/ui/Carousel';
import { DoctorCard, ServiceCard } from '@/components/cards';
import { OpenNowBadge, TimingsTable } from '@/components/contact/Hours';
import { ContactList, MapEmbed, hoursStrings } from '@/components/contact/helpers';

type P = { lang: Lang };
const sec = home.sections;

export function TrustStrip({ lang }: P) {
  const vars = siteVars(lang);
  return (
    <section aria-label={tx(sec.whyUs.eyebrow, lang)} className="relative z-10 -mt-4 lg:-mt-10">
      <div className="container">
        <ul className="grid gap-px overflow-hidden rounded-brand bg-line shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {home.trustStrip.map((item, i) => (
            <Reveal as="li" key={i} delay={i * 0.06} className="flex items-start gap-4 bg-surface p-5 sm:p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-primary">
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-heading font-semibold text-ink">{tx(item.title, lang, vars)}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{tx(item.text, lang, vars)}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AboutSplit({ lang }: P) {
  const a = home.about;
  const vars = siteVars(lang);
  return (
    <section className="section overflow-hidden" aria-labelledby="about-heading">
      <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="eyebrow mb-3">{tx(a.eyebrow, lang)}</p>
          <h2 id="about-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {tx(a.heading, lang, vars)} <DraftBadge status={home.status} lang={lang} />
          </h2>
          {a.paragraphs.map((p, i) => (
            <p key={i} className="mt-5 text-lg leading-relaxed text-ink-muted">
              {tx(p, lang, vars)}
            </p>
          ))}
          <ul className="mt-6 space-y-3">
            {a.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 font-medium">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                {tx(b, lang, vars)}
              </li>
            ))}
          </ul>
          <ButtonLink href={a.cta.href} lang={lang} className="mt-8">
            {tx(a.cta.label, lang)} <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </Reveal>
        <Reveal delay={0.1} className="relative">
          <div className="dot-grid absolute -right-4 -top-6 h-40 w-40 rounded-3xl opacity-60 sm:-right-8" aria-hidden />
          <div className="dot-grid absolute -bottom-6 -left-4 h-32 w-32 rounded-3xl opacity-60" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] border-8 border-surface shadow-lift">
            <ContentImage id={a.image} lang={lang} className="h-auto w-full" sizes="(min-width: 1024px) 560px, 100vw" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ServicesSection({ lang, limit }: P & { limit?: number }) {
  const dict = getDict(lang);
  const vars = siteVars(lang);
  const list = limit ? categories.slice(0, limit) : categories;
  return (
    <section className="section bg-surface" aria-labelledby="services-heading">
      <div className="container">
        <SectionHeading
          id="services-heading"
          eyebrow={tx(sec.services.eyebrow, lang)}
          heading={tx(sec.services.heading, lang)}
          intro={tx(sec.services.intro, lang, vars)}
        />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => (
            <Reveal as="li" key={c.slug} delay={(i % 3) * 0.08}>
              <ServiceCard category={c} lang={lang} />
            </Reveal>
          ))}
        </ul>
        {limit && limit < categories.length && (
          <div className="mt-10 text-center">
            <ButtonLink href="/services" lang={lang} variant="outline">
              {t(dict, 'cta.viewAllTreatments')}
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

/** "What's troubling you?" — each option deep-links into the booking wizard. */
export function ProblemPicker({ lang }: P) {
  return (
    <section className="section relative overflow-hidden" aria-labelledby="picker-heading">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-secondary-soft/70 to-transparent" aria-hidden />
      <div className="container relative">
        <SectionHeading
          id="picker-heading"
          eyebrow={tx(sec.problemPicker.eyebrow, lang)}
          heading={tx(sec.problemPicker.heading, lang)}
          intro={tx(sec.problemPicker.intro, lang)}
          badge={<DraftBadge status={routing.status} lang={lang} />}
        />
        <ul className="mx-auto mt-10 flex max-w-5xl flex-wrap justify-center gap-4">
          {routing.problems.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 3) * 0.06} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
              <Link
                href={`${localePath(lang, '/book')}?problem=${p.id}`}
                className="group flex h-full min-h-[88px] items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-lift"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon name={p.icon} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading font-semibold leading-snug text-ink">{tx(p.label, lang)}</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{tx(p.hint, lang)}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DoctorsSection({ lang }: P) {
  const dict = getDict(lang);
  return (
    <section className="section bg-surface" aria-labelledby="doctors-heading">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="doctors-heading"
            align="left"
            eyebrow={tx(sec.doctors.eyebrow, lang)}
            heading={tx(sec.doctors.heading, lang)}
            intro={tx(sec.doctors.intro, lang)}
          />
          <ButtonLink href="/doctors" lang={lang} variant="outline" className="shrink-0">
            {t(dict, 'cta.viewAllDoctors')}
          </ButtonLink>
        </div>
        <div className="mt-10">
          <Carousel label={tx(sec.doctors.heading, lang)} prevLabel={t(dict, 'common.carouselPrev')} nextLabel={t(dict, 'common.carouselNext')}>
            {doctors.map((d) => (
              <DoctorCard key={d.slug} doctor={d} lang={lang} compact />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

export function WhyUsGrid({ lang }: P) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {whyUs.reasons.map((r, i) => (
        <Reveal as="li" key={i} delay={(i % 3) * 0.06} className="group rounded-brand border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white transition-transform group-hover:scale-110">
            <Icon name={r.icon} className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold">{tx(r.title, lang)}</h3>
          <p className="mt-2 text-ink-muted">{tx(r.text, lang)}</p>
        </Reveal>
      ))}
    </ul>
  );
}

export function ProcessSteps({ lang }: P) {
  return (
    <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <span className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent lg:block" aria-hidden />
      {whyUs.steps.map((s, i) => (
        <Reveal as="li" key={i} delay={i * 0.08} className="relative rounded-brand bg-dark-soft/60 p-6 ring-1 ring-white/10">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-dark shadow-soft">
            <Icon name={s.icon} className="h-7 w-7" />
            <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white font-heading text-sm font-bold text-primary-dark">
              {i + 1}
            </span>
          </span>
          <h3 className="mt-5 text-lg font-semibold text-white">{tx(s.title, lang)}</h3>
          <p className="mt-2 text-on-dark-muted">{tx(s.text, lang)}</p>
        </Reveal>
      ))}
    </ol>
  );
}

export function WhyUsSection({ lang }: P) {
  return (
    <>
      <section className="section" aria-labelledby="why-heading">
        <div className="container">
          <SectionHeading
            id="why-heading"
            eyebrow={tx(sec.whyUs.eyebrow, lang)}
            heading={tx(sec.whyUs.heading, lang)}
            badge={<DraftBadge status={whyUs.status} lang={lang} />}
          />
          <div className="mt-12">
            <WhyUsGrid lang={lang} />
          </div>
        </div>
      </section>
      <section className="on-dark section relative overflow-hidden bg-dark" aria-labelledby="process-heading">
        <div className="dot-grid pointer-events-none absolute left-6 top-10 h-40 w-40 opacity-25" aria-hidden />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/40 blur-3xl" aria-hidden />
        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-3">{tx(sec.process.eyebrow, lang)}</p>
            <h2 id="process-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {tx(sec.process.heading, lang)}
            </h2>
          </div>
          <div className="mt-12">
            <ProcessSteps lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}

export function EducationTeaser({ lang }: P) {
  const dict = getDict(lang);
  const articles = getArticles().slice(0, 3);
  return (
    <section className="section" aria-labelledby="edu-heading">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading id="edu-heading" align="left" eyebrow={tx(sec.education.eyebrow, lang)} heading={tx(sec.education.heading, lang)} />
          <ButtonLink href="/patient-education" lang={lang} variant="outline" className="shrink-0">
            {t(dict, 'cta.viewAll')}
          </ButtonLink>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {articles.map((a, i) => (
            <Reveal as="li" key={a.meta.slug} delay={i * 0.08}>
              <ArticleCard article={a} lang={lang} featured={i === 0} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ArticleCard({ article, lang, featured }: { article: ReturnType<typeof getArticles>[number]; lang: Lang; featured?: boolean }) {
  const dict = getDict(lang);
  const m = article.meta;
  const title = (lang === 'te' && m.title_te) || m.title;
  return (
    <Link
      href={localePath(lang, `/patient-education/${m.slug}`)}
      className={cn(
        'group flex h-full flex-col rounded-brand border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift',
        featured ? 'on-dark border-transparent bg-gradient-to-br from-primary to-dark text-white' : 'border-line bg-surface',
      )}
    >
      <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', featured ? 'bg-accent text-dark' : 'bg-secondary-soft text-primary')}>
        <Icon name={m.icon} className="h-6 w-6" />
      </span>
      <h3 className={cn('mt-5 flex flex-wrap items-center gap-2 text-xl font-semibold', featured && 'text-white')}>
        {title}
        <DraftBadge status={m.status} lang={lang} />
      </h3>
      <p className={cn('mt-2 flex-1', featured ? 'text-on-dark-muted' : 'text-ink-muted')}>{m.summary}</p>
      <span className={cn('mt-5 inline-flex items-center gap-2 text-sm font-semibold', featured ? 'text-accent' : 'text-primary')}>
        {t(dict, 'cta.readArticle')} · {article.readMinutes} {t(dict, 'common.minRead')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}

/** Google reviews card. Never shows invented reviews; rating appears only once real values are in reviews.json. */
export function ReviewsCard({ lang, headingLevel = 'h2' }: P & { headingLevel?: 'h2' | 'h3' }) {
  const dict = getDict(lang);
  const H = headingLevel;
  const c = reviews.card;
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-8 shadow-soft sm:p-12">
      <div className="dot-grid pointer-events-none absolute -right-6 -top-6 h-36 w-36 opacity-50" aria-hidden />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary-soft">
          <Star className="h-10 w-10 fill-accent text-accent" aria-hidden />
        </div>
        <div>
          <H className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
            {tx(c.heading, lang)} <DraftBadge status={reviews.status} lang={lang} />
          </H>
          {reviews.rating && reviews.reviewCount ? (
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <span className="flex text-accent" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn('h-5 w-5', i < Math.round(reviews.rating ?? 0) && 'fill-current')} />
                ))}
              </span>
              {reviews.rating.toFixed(1)} · {reviews.reviewCount} {t(dict, 'reviews.onGoogle')}
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-ink-muted">{tx(c.text, lang)}</p>
          <p className="mt-3 text-xs text-ink-muted">{t(dict, 'reviews.noFake')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <a href={reviews.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary')}>
            {tx(c.readCta, lang)} <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          {reviews.writeReviewUrl && (
            <a href={reviews.writeReviewUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('outline')}>
              {tx(c.writeCta, lang)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({ lang }: P) {
  return (
    <section className="section bg-surface" aria-labelledby="reviews-heading">
      <div className="container">
        <SectionHeading id="reviews-heading" eyebrow={tx(sec.reviews.eyebrow, lang)} heading={tx(sec.reviews.heading, lang)} />
        <Reveal className="mt-10">
          <ReviewsCard lang={lang} headingLevel="h3" />
        </Reveal>
      </div>
    </section>
  );
}

export function FaqSection({ lang }: P) {
  const dict = getDict(lang);
  const vars = siteVars(lang);
  const items = faqs.faqs.filter((f) => f.home).map((f) => ({ q: tx(f.q, lang, vars), a: tx(f.a, lang, vars) }));
  return (
    <section className="section" aria-labelledby="faq-heading">
      <div className="container grid items-start gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            id="faq-heading"
            align="left"
            eyebrow={tx(sec.faq.eyebrow, lang)}
            heading={tx(sec.faq.heading, lang)}
            badge={<DraftBadge status={faqs.status} lang={lang} />}
          />
          <Accordion items={items} className="mt-8" />
          <Link href={localePath(lang, '/faqs')} className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-heading font-semibold text-primary hover:underline">
            {t(dict, 'faq.seeAll')} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <Reveal delay={0.1} className="relative hidden lg:block">
          <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-accent/30 blur-xl" aria-hidden />
          <ContentImage id="faq-panel" lang={lang} decorative className="relative h-auto w-full rounded-[2.5rem_0.75rem_2.5rem_0.75rem] shadow-lift" />
        </Reveal>
      </div>
    </section>
  );
}

export function CtaBanner({ lang }: P) {
  const c = home.ctaBanner;
  return (
    <section className="py-12 sm:py-16" aria-labelledby="cta-heading">
      <div className="container">
        <Reveal className="on-dark relative overflow-hidden rounded-[2rem] bg-dark px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/50 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" aria-hidden />
          <div className="dot-grid pointer-events-none absolute right-8 top-8 h-24 w-32 opacity-30" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {tx(c.heading, lang)}
            </h2>
            <p className="mt-4 text-lg text-on-dark-muted">{tx(c.text, lang)}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={c.primary.href} lang={lang} variant="gold" size="lg">
                {tx(c.primary.label, lang)}
              </ButtonLink>
              <ButtonLink href={c.secondary.href} lang={lang} variant="outline-white" size="lg">
                {tx(c.secondary.label, lang)}
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ContactSection({ lang }: P) {
  const hs = hoursStrings(lang);
  return (
    <section className="section bg-surface" aria-labelledby="contact-heading">
      <div className="container">
        <SectionHeading id="contact-heading" eyebrow={tx(sec.contact.eyebrow, lang)} heading={tx(sec.contact.heading, lang)} />
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <OpenNowBadge hours={clinic.hours} timezone={clinic.timezone} strings={hs} />
            <ContactList lang={lang} />
            <TimingsTable hours={clinic.hours} timezone={clinic.timezone} strings={hs} />
          </div>
          <MapEmbed lang={lang} className="flex flex-col" />
        </div>
      </div>
    </section>
  );
}
