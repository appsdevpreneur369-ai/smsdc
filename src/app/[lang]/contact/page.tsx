import { MapPin } from 'lucide-react';
import { clinic } from '@/lib/content';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { siteVars } from '@/lib/vars';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink, DraftBadge } from '@/components/ui/primitives';
import { OpenNowBadge, TimingsTable } from '@/components/contact/Hours';
import { ContactList, MapEmbed, hoursStrings } from '@/components/contact/helpers';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('contact', params.lang, '/contact');
}

export default function ContactPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('contact', lang);
  const dict = getDict(lang);
  const hs = hoursStrings(lang);
  const vars = siteVars(lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/contact' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <OpenNowBadge hours={clinic.hours} timezone={clinic.timezone} strings={hs} />
          <DraftBadge status={clinic.status} lang={lang} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="@call" lang={lang} size="lg">
            {t(dict, 'cta.callUs')}
          </ButtonLink>
          <ButtonLink href="@whatsapp" lang={lang} size="lg" variant="whatsapp">
            {t(dict, 'cta.whatsappUs')}
          </ButtonLink>
          <ButtonLink href="/book" lang={lang} size="lg" variant="outline">
            {t(dict, 'cta.book')}
          </ButtonLink>
        </div>
      </PageHeader>

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">{t(dict, 'contact.reach')}</h2>
              <div className="mt-4">
                <ContactList lang={lang} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t(dict, 'hours.title')}</h2>
              <div className="mt-4">
                <TimingsTable hours={clinic.hours} timezone={clinic.timezone} strings={hs} />
              </div>
              {clinic.hoursNote && <p className="mt-3 text-sm text-ink-muted">{tx(clinic.hoursNote, lang)}</p>}
            </div>
          </div>
          <div className="space-y-8">
            <MapEmbed lang={lang} className="flex h-[420px] flex-col lg:h-[520px]" />
            <div className="rounded-brand border border-line bg-surface p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="h-5 w-5 text-primary" aria-hidden />
                {t(dict, 'contact.areas')} <DraftBadge status={clinic.serviceAreas.status} lang={lang} />
              </h2>
              <p className="mt-2 text-ink-muted">{t(dict, 'contact.areasText', { area: String(vars.area) })}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[clinic.serviceAreas.primary, ...clinic.serviceAreas.nearby].map((a) => (
                  <li key={a} className="rounded-full bg-secondary-soft px-3 py-1.5 text-sm font-medium text-primary-dark">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
