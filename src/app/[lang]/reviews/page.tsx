import type { Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { CtaBanner, ReviewsCard } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('reviews', params.lang, '/reviews');
}

// Live Google reviews (Places API) plug in here later: reviews.json liveReviewsEnabled + placeId + GOOGLE_PLACES_API_KEY.
// Until then this page never shows review text — only a link to the Google listing.
export default function ReviewsPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('reviews', lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/reviews' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro} />
      <section className="section">
        <div className="container max-w-5xl">
          <ReviewsCard lang={lang} />
        </div>
      </section>
      <CtaBanner lang={lang} />
    </>
  );
}
