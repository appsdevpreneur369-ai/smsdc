import type { Metadata } from 'next';
import type { Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountPage } from '@/components/account/AccountPage';

export function generateMetadata({ params }: { params: { lang: Lang } }): Metadata {
  // Personal page: never indexed (and not in the sitemap).
  return { ...staticPageMetadata('account', params.lang, '/account'), robots: { index: false, follow: false } };
}

/** Patient account: sign in / sign up, then My appointments (ClinicFlow). Everything personal renders client-side. */
export default function Account({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('account', lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/account' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro} />
      <section className="section">
        <div className="container">
          <AccountPage />
        </div>
      </section>
    </>
  );
}
