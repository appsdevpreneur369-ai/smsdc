import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award, CalendarClock, GraduationCap } from 'lucide-react';
import { categoriesForDoctor, doctors } from '@/lib/content';
import { consultLines } from '@/lib/doctors';
import { getDict, locales, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { physicianJsonLd } from '@/lib/jsonld';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink, DraftBadge, SectionHeading } from '@/components/ui/primitives';
import { JsonLd } from '@/components/seo/JsonLd';
import { DoctorCard } from '@/components/cards';
import { CtaBanner } from '@/components/sections/home';

type Params = { lang: Lang; slug: string };

export function generateStaticParams() {
  return locales.flatMap((lang) => doctors.map((d) => ({ lang, slug: d.slug })));
}

export function generateMetadata({ params }: { params: Params }) {
  const d = doctors.find((x) => x.slug === params.slug);
  if (!d) return {};
  return pageMetadata({
    lang: params.lang,
    path: `/doctors/${d.slug}`,
    title: `${d.displayName}, ${d.qualification} — ${tx(d.shortSpeciality, params.lang)}`,
    description: tx(d.summary, params.lang),
  });
}

export default function DoctorPage({ params: { lang, slug } }: { params: Params }) {
  const d = doctors.find((x) => x.slug === slug);
  if (!d) notFound();
  const dict = getDict(lang);
  const cats = categoriesForDoctor(d.slug);
  const bio = (lang === 'te' && d.bio.te) || d.bio.en;
  const teluguLine = typeof d.speciality === 'object' ? d.speciality.te : undefined;
  const others = doctors.filter((x) => x.slug !== d.slug).slice(0, 3);

  return (
    <>
      <PageHeader
        lang={lang}
        crumbs={[
          { name: t(dict, 'nav.doctors'), path: '/doctors' },
          { name: d.displayName, path: `/doctors/${d.slug}` },
        ]}
        heading={d.displayName}
        intro={tx(d.summary, lang)}
        aside={
          <div className="relative mx-auto w-full max-w-[220px] sm:max-w-sm">
            <div className="dot-grid absolute -right-4 -top-4 h-28 w-28 opacity-50" aria-hidden />
            <Avatar doctor={d} size="lg" className="relative aspect-square w-full rounded-[2rem] shadow-lift" />
            {!d.avatar.image && (
              <p className="mt-3 text-center text-xs text-ink-muted">{t(dict, 'doctors.avatarNote')}</p>
            )}
          </div>
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {d.role === 'head' && <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-dark">{t(dict, 'doctors.headBadge')}</span>}
          <DraftBadge status={d.status} lang={lang} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              {t(dict, 'common.qualification')}
            </dt>
            <dd className="mt-1 pl-7 font-semibold">{d.qualification}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <Award className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              {t(dict, 'common.speciality')}
            </dt>
            <dd className="mt-1 pl-7 font-semibold">{tx(d.speciality, lang)}</dd>
            {lang === 'en' && teluguLine && (
              <dd lang="te" className="pl-7 text-sm text-ink-muted">
                {teluguLine}
              </dd>
            )}
          </div>
          {d.experience && (
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                {t(dict, 'common.experience')}
              </dt>
              <dd className="mt-1 pl-7 font-semibold">{tx(d.experience, lang)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-7">
          <ButtonLink href={`/book?doctor=${d.slug}`} lang={lang} size="lg">
            {t(dict, 'cta.bookWith', { doctor: d.displayName })}
          </ButtonLink>
        </div>
      </PageHeader>

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="prose-clinic">
              {bio.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <h2 className="mt-10 text-2xl font-bold">{t(dict, 'common.expertise')}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {d.expertise.map((e) => (
                <li key={e} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium">
                  {e}
                </li>
              ))}
            </ul>
            {cats.length > 0 && (
              <>
                <h2 className="mt-10 text-2xl font-bold">{t(dict, 'doctors.treats')}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {cats.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={localePath(lang, `/services/${c.slug}`)}
                        className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-surface p-3 font-heading font-semibold transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-primary">
                          <Icon name={c.icon} className="h-5 w-5" />
                        </span>
                        {tx(c.title, lang)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="on-dark rounded-brand bg-dark p-6 text-on-dark-muted">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
                <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
                {t(dict, 'common.consultHours')}
              </h2>
              <ul className="mt-4 space-y-2">
                {consultLines(d, lang).map((l) => (
                  <li key={l} className="rounded-xl bg-white/5 px-4 py-3 font-medium text-white">
                    {l}
                  </li>
                ))}
              </ul>
              {d.registrationNumber && (
                <p className="mt-4 text-sm">
                  {t(dict, 'doctors.registration')}: {d.registrationNumber}
                </p>
              )}
              <ButtonLink href={`/book?doctor=${d.slug}`} lang={lang} variant="gold" className="mt-6 w-full">
                {t(dict, 'cta.book')}
              </ButtonLink>
              <ButtonLink href="@call" lang={lang} variant="outline-white" className="mt-3 w-full">
                {t(dict, 'cta.callUs')}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>

      <section className="section bg-surface">
        <div className="container">
          <SectionHeading heading={t(dict, 'nav.doctors')} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.slug}>
                <DoctorCard doctor={o} lang={lang} compact />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
      <JsonLd data={physicianJsonLd(d, lang)} />
    </>
  );
}
