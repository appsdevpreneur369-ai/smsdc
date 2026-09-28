import type { Metadata } from 'next';
import { pages } from '@/lib/content';
import { tx, type Lang } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { siteVars } from '@/lib/vars';
import { Hero } from '@/components/sections/Hero';
import {
  AboutSplit,
  ClinicPhotosTeaser,
  ContactSection,
  CtaBanner,
  DoctorsSection,
  EducationTeaser,
  FaqSection,
  ProblemPicker,
  ReviewsSection,
  ServicesSection,
  TrustStrip,
  WhyUsSection,
} from '@/components/sections/home';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqJsonLd } from '@/lib/jsonld';
import { faqs } from '@/lib/content';

export function generateMetadata({ params }: { params: { lang: Lang } }): Metadata {
  const vars = siteVars(params.lang);
  return pageMetadata({
    lang: params.lang,
    path: '/',
    title: tx(pages.home.title, params.lang, vars),
    description: tx(pages.home.description, params.lang, vars),
    absoluteTitle: true,
  });
}

export default function HomePage({ params: { lang } }: { params: { lang: Lang } }) {
  return (
    <>
      <Hero lang={lang} />
      <TrustStrip lang={lang} />
      <ServicesSection lang={lang} />
      <ClinicPhotosTeaser lang={lang} />
      <ProblemPicker lang={lang} />
      <AboutSplit lang={lang} />
      <DoctorsSection lang={lang} />
      <WhyUsSection lang={lang} />
      <EducationTeaser lang={lang} />
      <ReviewsSection lang={lang} />
      <FaqSection lang={lang} />
      <CtaBanner lang={lang} />
      <ContactSection lang={lang} />
      <JsonLd data={faqJsonLd(faqs.faqs.filter((f) => f.home), lang, siteVars(lang))} />
    </>
  );
}
