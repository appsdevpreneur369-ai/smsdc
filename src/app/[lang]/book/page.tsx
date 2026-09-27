import { Clock, MessageCircle, Phone } from 'lucide-react';
import { booking, clinic } from '@/lib/content';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { telHref } from '@/lib/links';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { DraftBadge } from '@/components/ui/primitives';
import { BookPageForm } from '@/components/booking/BookPageForm';
import { OpenNowBadge } from '@/components/contact/Hours';
import { hoursStrings } from '@/components/contact/helpers';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('book', params.lang, '/book');
}

/** Full-page booking form (same component as the popup). ?problem= / ?treatment= / ?doctor= pre-select. */
export default function BookPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('book', lang);
  const dict = getDict(lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/book' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={booking.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[2rem] border border-line bg-surface p-5 shadow-soft sm:p-8 lg:p-10">
            <h2 className="text-2xl font-bold sm:text-3xl">{t(dict, 'bookingForm.title')}</h2>
            <p className="mb-6 mt-1 font-medium text-primary-dark">{t(dict, 'bookingForm.subtitle')}</p>
            <BookPageForm />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-brand border border-line bg-surface p-5 shadow-soft">
              <OpenNowBadge hours={clinic.hours} timezone={clinic.timezone} strings={hoursStrings(lang)} />
              {clinic.hoursNote && (
                <p className="mt-3 flex gap-2 text-sm text-ink-muted">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {tx(clinic.hoursNote, lang)}
                </p>
              )}
            </div>
            <div className="on-dark rounded-brand bg-dark p-5 text-on-dark-muted">
              <p className="flex gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                {tx(booking.note, lang)}
              </p>
              <p className="mt-4 flex gap-3">
                <Phone className="mt-3 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <a href={telHref} className="inline-flex min-h-[44px] items-center font-semibold text-white hover:text-accent">
                  {t(dict, 'cta.callUs')}: {clinic.phone.display}
                </a>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
