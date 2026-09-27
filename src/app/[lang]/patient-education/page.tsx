import { getArticles } from '@/lib/content/markdown';
import type { Lang } from '@/lib/i18n';
import { pageHeader, staticPageMetadata } from '@/lib/page';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { ArticleCard, CtaBanner } from '@/components/sections/home';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return staticPageMetadata('education', params.lang, '/patient-education');
}

export default function EducationPage({ params: { lang } }: { params: { lang: Lang } }) {
  const h = pageHeader('education', lang);
  const articles = getArticles();
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: h.title, path: '/patient-education' }]} eyebrow={h.eyebrow} heading={h.heading} intro={h.intro} />
      <section className="section">
        <div className="container">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <Reveal as="li" key={a.meta.slug} delay={(i % 3) * 0.06}>
                <ArticleCard article={a} lang={lang} featured={i === 0} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
    </>
  );
}
