import { home, whyUs } from '@/lib/content';
import { tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { DraftBadge } from '@/components/ui/primitives';
import { CtaBanner, ProblemPicker, ProcessSteps, WhyUsGrid } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('whyUs', params.lang, '/why-us');
}

export default function WhyUsPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('whyUs', lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/why-us' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={whyUs.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container">
          <WhyUsGrid lang={lang} />
        </div>
      </section>
      <section className="on-dark section bg-dark" aria-labelledby="process-heading">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow mb-3">{tx(home.sections.process.eyebrow, lang)}</p>
            <h2 id="process-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {tx(home.sections.process.heading, lang)}
            </h2>
          </div>
          <ProcessSteps lang={lang} />
        </div>
      </section>
      <ProblemPicker lang={lang} />
      <CtaBanner lang={lang} />
    </>
  );
}
