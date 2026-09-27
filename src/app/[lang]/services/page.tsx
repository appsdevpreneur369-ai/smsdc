import { HandCoins } from 'lucide-react';
import { categories, services } from '@/lib/content';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { ServiceCard } from '@/components/cards';
import { Reveal } from '@/components/ui/Reveal';
import { CtaBanner, ProblemPicker } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('services', params.lang, '/services');
}

export default function ServicesPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('services', lang);
  const dict = getDict(lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/services' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <p className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-soft">
          <HandCoins className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-semibold">{t(dict, 'services.pricing')}:</span> {tx(services.pricingNote, lang)}
          </span>
        </p>
      </PageHeader>
      <section className="section">
        <div className="container">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={(i % 3) * 0.08}>
                <ServiceCard category={c} lang={lang} headingLevel="h2" />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <ProblemPicker lang={lang} />
      <CtaBanner lang={lang} />
    </>
  );
}
