import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { clinicHead, doctors } from '@/lib/content';
import { consultLines } from '@/lib/doctors';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { DoctorCard } from '@/components/cards';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonLink, DraftBadge } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/Reveal';
import { CtaBanner } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('doctors', params.lang, '/doctors');
}

export default function DoctorsPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('doctors', lang);
  const dict = getDict(lang);
  const head = clinicHead;
  const others = doctors.filter((d) => d.slug !== head.slug);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/doctors' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro} />

      <section className="section pb-8">
        <div className="container">
          <Reveal className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-soft md:grid-cols-[320px_1fr] lg:grid-cols-[400px_1fr]">
            <div className="relative">
              <Avatar doctor={head} size="lg" className="h-full min-h-[280px] w-full" />
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-dark">{t(dict, 'doctors.headBadge')}</span>
            </div>
            <div className="p-6 sm:p-10">
              <h2 className="flex flex-wrap items-center gap-2 text-3xl font-bold">
                {head.displayName} <DraftBadge status={head.status} lang={lang} />
              </h2>
              <p className="mt-1 font-semibold text-primary">
                {head.qualification} · {tx(head.speciality, lang)}
              </p>
              {head.experience && <p className="mt-1 text-sm font-semibold text-accent-text">{tx(head.experience, lang)}</p>}
              <p className="mt-5 leading-relaxed text-ink-muted">{((lang === 'te' && head.bio.te) || head.bio.en)[0]}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {head.expertise.map((e) => (
                  <li key={e} className="rounded-full bg-secondary-soft px-3 py-1.5 text-sm font-medium text-primary-dark">
                    {e}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <ButtonLink href={`/book?doctor=${head.slug}`} lang={lang}>
                  {t(dict, 'cta.bookWith', { doctor: head.displayName })}
                </ButtonLink>
                <Link href={localePath(lang, `/doctors/${head.slug}`)} className="inline-flex min-h-[44px] items-center gap-2 font-heading font-semibold text-primary hover:underline">
                  {t(dict, 'cta.viewProfile')} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section pt-8">
        <div className="container">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((d, i) => (
              <Reveal as="li" key={d.slug} delay={(i % 3) * 0.06} className="flex flex-col">
                <DoctorCard doctor={d} lang={lang} />
                <p className="mt-3 flex items-center gap-2 px-2 text-sm text-ink-muted">
                  <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {t(dict, 'common.consultHours')}: {consultLines(d, lang).join('; ')}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
    </>
  );
}
