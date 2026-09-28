import { clinic, gallery } from '@/lib/content';
import { galleryCategories, galleryPhotos } from '@/lib/gallery';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { clinicId } from '@/lib/jsonld';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { absoluteUrl } from '@/lib/seo';
import { PageHeader } from '@/components/layout/PageHeader';
import { DraftBadge } from '@/components/ui/primitives';
import { CtaBanner } from '@/components/sections/home';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { JsonLd } from '@/components/seo/JsonLd';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('gallery', params.lang, '/gallery');
}

export default function GalleryPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('gallery', lang);
  const dict = getDict(lang);
  const photos = galleryPhotos(lang);
  const g = (k: string) => t(dict, `gallery.${k}`);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/gallery' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro}>
        <div className="mt-5">
          <DraftBadge status={gallery.status} lang={lang} />
        </div>
      </PageHeader>
      <section className="section">
        <div className="container">
          <GalleryGrid
            photos={photos}
            categories={galleryCategories(lang)}
            strings={{ all: g('all'), filterLabel: g('filterLabel'), open: g('open'), dialogLabel: g('dialogLabel'), close: g('close'), previous: g('previous'), next: g('next'), counter: g('counter') }}
          />
        </div>
      </section>
      <CtaBanner lang={lang} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ImageGallery',
          name: h.heading,
          description: h.intro,
          url: absoluteUrl(localePath(lang, '/gallery')),
          inLanguage: lang,
          about: { '@id': clinicId() },
          image: photos.map((p) => ({
            '@type': 'ImageObject',
            contentUrl: absoluteUrl(p.src),
            name: p.caption,
            caption: p.caption,
            description: p.alt,
            width: { '@type': 'QuantitativeValue', value: p.width, unitCode: 'E37' },
            height: { '@type': 'QuantitativeValue', value: p.height, unitCode: 'E37' },
            creditText: tx(clinic.displayName, 'en'),
            copyrightNotice: `© ${tx(clinic.displayName, 'en')}`,
          })),
        }}
      />
    </>
  );
}
