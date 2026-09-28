import { clinicHead, pages } from '@/lib/content';
import { photosFor } from '@/lib/gallery';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { siteVars } from '@/lib/vars';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink, DraftBadge } from '@/components/ui/primitives';
import { PhotoThumb } from '@/components/gallery/PhotoThumb';
import { Reveal } from '@/components/ui/Reveal';
import { CtaBanner, DoctorsSection, TrustStrip, WhyUsSection } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('about', params.lang, '/about');
}

export default function AboutPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('about', lang);
  const dict = getDict(lang);
  const vars = siteVars(lang);
  const about = pages.about;
  // images.json placement "about": the first sits beside the heading (desktop), the next with the clinic story.
  const aboutPhotos = photosFor('about', lang);
  const storyPhoto = aboutPhotos[1] ?? aboutPhotos[0];
  return (
    <>
      <PageHeader
        lang={lang}
        crumbs={[{ name: h.title, path: '/about' }]}
        eyebrow={h.eyebrow}
        heading={h.heading}
        intro={h.intro}
        aside={
          <div className="relative hidden lg:block">
            <div className="dot-grid absolute -right-4 -top-4 h-32 w-32 opacity-60" aria-hidden />
            <div className="relative overflow-hidden rounded-[2rem] border-8 border-surface shadow-lift">
              {aboutPhotos[0] && <PhotoThumb photo={aboutPhotos[0]} sizes="480px" />}
            </div>
          </div>
        }
      >
        <div className="mt-5">
          <DraftBadge status={pages.status} lang={lang} />
        </div>
      </PageHeader>
      <div className="pt-12 lg:pt-16">
        <TrustStrip lang={lang} />
      </div>

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="prose-clinic">
            {about.story.map((p, i) => (
              <p key={i}>{tx(p, lang, vars)}</p>
            ))}
            {storyPhoto && (
              <figure className="not-prose my-8 overflow-hidden rounded-brand border border-line bg-surface shadow-soft">
                <PhotoThumb photo={storyPhoto} sizes="(min-width: 1024px) 640px, 100vw" />
                <figcaption className="p-4 font-heading text-sm font-semibold">{storyPhoto.caption}</figcaption>
              </figure>
            )}
            <div className="mt-8">
              <ButtonLink href={`/doctors/${clinicHead.slug}`} lang={lang}>
                {clinicHead.displayName} — {t(dict, 'cta.viewProfile')}
              </ButtonLink>
            </div>
          </Reveal>
          <ul className="grid gap-4">
            {about.values.map((v, i) => (
              <Reveal as="li" key={i} delay={i * 0.06} className="flex gap-4 rounded-brand border border-line bg-surface p-5 shadow-soft">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                  <Icon name={v.icon} className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-heading text-lg font-semibold">{tx(v.title, lang)}</span>
                  <span className="mt-1 block text-ink-muted">{tx(v.text, lang)}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <DoctorsSection lang={lang} />
      <WhyUsSection lang={lang} />
      <CtaBanner lang={lang} />
    </>
  );
}
