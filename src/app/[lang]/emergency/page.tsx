import Link from 'next/link';
import { AlertTriangle, ArrowRight, Hospital, Phone } from 'lucide-react';
import { clinic, emergency } from '@/lib/content';
import { getArticle } from '@/lib/content/markdown';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink, DraftBadge } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/Reveal';
import { OpenNowBadge } from '@/components/contact/Hours';
import { hoursStrings } from '@/components/contact/helpers';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('emergency', params.lang, '/emergency');
}

export default function EmergencyPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('emergency', lang);
  const dict = getDict(lang);
  const urgent = getArticle('when-to-see-a-dentist-urgently');
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/emergency' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="@call" lang={lang} size="lg" className="text-lg">
            <Phone className="h-5 w-5" aria-hidden /> {t(dict, 'emergency.callNow')} · {clinic.phone.display}
          </ButtonLink>
          <ButtonLink href="@whatsapp" lang={lang} size="lg" variant="whatsapp">
            {t(dict, 'emergency.whatsappNow')}
          </ButtonLink>
        </div>
        <div className="mt-5">
          <OpenNowBadge hours={clinic.hours} timezone={clinic.timezone} strings={hoursStrings(lang)} />
        </div>
      </PageHeader>

      <section className="section">
        <div className="container space-y-10">
          <div role="note" className="flex gap-4 rounded-brand border-2 border-danger/40 bg-danger/5 p-5 sm:p-6">
            <Hospital className="mt-0.5 h-7 w-7 shrink-0 text-danger" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-danger">{t(dict, 'emergency.whenHospital')}</h2>
              <p className="mt-1 leading-relaxed">{tx(emergency.urgentWarning, lang)}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <p className="rounded-brand bg-surface p-5 font-medium shadow-soft">{tx(emergency.duringHours, lang)}</p>
            <p className="rounded-brand bg-surface p-5 font-medium shadow-soft">{tx(emergency.afterHours, lang)}</p>
          </div>

          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
              {t(dict, 'emergency.firstAid')} <DraftBadge status={emergency.status} lang={lang} />
            </h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {emergency.situations.map((s, i) => (
                <Reveal as="li" key={s.id} delay={(i % 2) * 0.06}>
                  <article id={s.id} className="h-full scroll-mt-28 rounded-brand border border-line bg-surface p-6 shadow-soft">
                    <h3 className="flex items-center gap-3 text-xl font-semibold">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-dark">
                        <Icon name={s.icon} className="h-5 w-5" />
                      </span>
                      {tx(s.title, lang)}
                    </h3>
                    <ol className="mt-5 space-y-3">
                      {s.steps.map((step, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-soft font-heading text-sm font-bold text-primary">
                            {j + 1}
                          </span>
                          <span className="leading-relaxed">{tx(step, lang)}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                </Reveal>
              ))}
            </ul>
          </div>

          {urgent && (
            <Link
              href={localePath(lang, `/patient-education/${urgent.meta.slug}`)}
              className="on-dark group flex items-center justify-between gap-4 rounded-brand bg-dark p-6 text-white transition hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-4">
                <AlertTriangle className="h-7 w-7 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block font-heading text-lg font-semibold">{(lang === 'te' && urgent.meta.title_te) || urgent.meta.title}</span>
                  <span className="block text-on-dark-muted">{urgent.meta.summary}</span>
                </span>
              </span>
              <ArrowRight className="h-6 w-6 shrink-0 text-accent transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          )}

          <p className="text-sm text-ink-muted">
            <Link href={localePath(lang, '/disclaimer')} className="font-semibold text-primary underline underline-offset-2">
              {t(dict, 'nav.disclaimer')}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
