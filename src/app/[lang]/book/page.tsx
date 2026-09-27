import { Suspense } from 'react';
import { Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import { booking, clinic, doctors, effectiveBookingMode, routing } from '@/lib/content';
import { consultLines } from '@/lib/doctors';
import { DAYS } from '@/lib/hours';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { telHref } from '@/lib/links';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { DraftBadge } from '@/components/ui/primitives';
import { BookingWizard, type WizardStrings } from '@/components/booking/BookingWizard';
import { OpenNowBadge } from '@/components/contact/Hours';
import { hoursStrings } from '@/components/contact/helpers';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('book', params.lang, '/book');
}

export default function BookPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('book', lang);
  const dict = getDict(lang);
  const b = dict.booking;

  const strings: WizardStrings = {
    ...b,
    back: t(dict, 'cta.back'),
    next: t(dict, 'cta.next'),
    doctor: t(dict, 'common.doctor'),
    consultation: t(dict, 'common.consultation'),
    viewProfile: t(dict, 'cta.viewProfile'),
  };

  const wizardDoctors = doctors.map((d) => {
    const days = DAYS.filter((day) => d.consultation.some((c) => c.days.includes(day))).map((day) => t(dict, `days.${day}`));
    return {
      slug: d.slug,
      name: d.displayName,
      qualification: d.qualification,
      speciality: tx(d.speciality, lang),
      consult: consultLines(d, lang),
      days,
      profileHref: localePath(lang, `/doctors/${d.slug}`),
      clinicflowId: d.clinicflowDoctorId,
      avatar: <Avatar doctor={d} size="sm" className="h-full w-full" />,
    };
  });

  const problems = routing.problems.map((p) => ({
    id: p.id,
    icon: p.icon,
    label: tx(p.label, lang),
    hint: tx(p.hint, lang),
    doctors: p.doctors,
    any: p.mode === 'any',
  }));

  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/book' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={booking.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_320px]">
          <Suspense>
            <BookingWizard
              problems={problems}
              doctors={wizardDoctors}
              strings={strings}
              config={{
                mode: effectiveBookingMode,
                clinicflowUrl: booking.clinicflowBookingUrl,
                clinicflowDoctorParam: booking.clinicflowDoctorParam,
                allowDirect: booking.allowDirectSpecialistBooking,
                defaultDoctor: booking.defaultDoctor,
                whatsappNumber: clinic.whatsapp.e164.replace(/\D/g, ''),
                messageTemplate: tx(booking.whatsappMessage, lang),
                clinicName: tx(clinic.shortName, lang),
                telHref,
                phoneDisplay: clinic.phone.display,
                note: tx(booking.note, lang),
              }}
            />
          </Suspense>
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
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <a href={telHref} className="font-semibold text-white hover:text-accent">
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
