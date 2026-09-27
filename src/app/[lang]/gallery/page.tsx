import { ImageIcon } from 'lucide-react';
import { gallery } from '@/lib/content';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentImage, DraftBadge } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/Reveal';
import { CtaBanner } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('gallery', params.lang, '/gallery');
}

export default function GalleryPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('gallery', lang);
  const dict = getDict(lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/gallery' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={gallery.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.items.map((item, i) => (
              <Reveal as="li" key={i} delay={(i % 3) * 0.06}>
                <figure className="group overflow-hidden rounded-brand border border-line bg-surface shadow-soft">
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary-soft">
                    {item.image ? (
                      <ContentImage
                        id={item.image}
                        lang={lang}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/25 text-primary">
                        <div className="dot-grid absolute inset-0 opacity-20" aria-hidden />
                        <ImageIcon className="relative h-10 w-10" aria-hidden />
                        <span className="relative text-sm font-semibold">{t(dict, 'gallery.comingSoon')}</span>
                      </div>
                    )}
                  </div>
                  <figcaption className="p-4 font-heading font-semibold">{tx(item.caption, lang)}</figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
    </>
  );
}
