import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { getCategory } from '@/lib/content';
import { getArticle, getArticles, renderMarkdown } from '@/lib/content/markdown';
import { getDict, locales, localePath, t, tx, type Lang } from '@/lib/i18n';
import { pageMetadata, absoluteUrl } from '@/lib/seo';
import { clinicId } from '@/lib/jsonld';
import { siteVars } from '@/lib/vars';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ContentImage, DraftBadge } from '@/components/ui/primitives';
import { JsonLd } from '@/components/seo/JsonLd';
import { ArticleCard, CtaBanner } from '@/components/sections/home';

type Params = { lang: Lang; slug: string };

export function generateStaticParams() {
  return locales.flatMap((lang) => getArticles().map((a) => ({ lang, slug: a.meta.slug })));
}

export function generateMetadata({ params }: { params: Params }) {
  const a = getArticle(params.slug);
  if (!a) return {};
  return pageMetadata({
    lang: params.lang,
    path: `/patient-education/${a.meta.slug}`,
    title: (params.lang === 'te' && a.meta.title_te) || a.meta.title,
    description: a.meta.summary,
    type: 'article',
  });
}

export default function ArticlePage({ params: { lang, slug } }: { params: Params }) {
  const a = getArticle(slug);
  if (!a) notFound();
  const dict = getDict(lang);
  const title = (lang === 'te' && a.meta.title_te) || a.meta.title;
  const related = a.meta.relatedService ? getCategory(a.meta.relatedService) : undefined;
  const more = getArticles().filter((x) => x.meta.slug !== a.meta.slug).slice(0, 3);
  const html = renderMarkdown(a.body, siteVars(lang));

  return (
    <>
      <PageHeader
        lang={lang}
        crumbs={[
          { name: t(dict, 'nav.education'), path: '/patient-education' },
          { name: title, path: `/patient-education/${a.meta.slug}` },
        ]}
        heading={title}
        intro={a.meta.summary}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 font-medium shadow-soft">
            <Icon name={a.meta.icon} className="h-4 w-4 text-primary" />
            {a.readMinutes} {t(dict, 'common.minRead')}
          </span>
          {a.meta.reviewedBy && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 font-medium text-accent-text">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              {a.meta.reviewStatus === 'reviewed' ? a.meta.reviewedBy : t(dict, 'common.reviewedBy', { name: a.meta.reviewedBy })}
            </span>
          )}
          <DraftBadge status={a.meta.status} lang={lang} />
        </div>
      </PageHeader>

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            {a.meta.image && (
              <figure className="mb-10 overflow-hidden rounded-brand border border-line bg-surface shadow-soft">
                <ContentImage id={a.meta.image} lang={lang} className="mx-auto h-auto w-full max-w-xl" sizes="(min-width: 1024px) 640px, 100vw" />
              </figure>
            )}
            <div className="prose-clinic" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {related && (
              <Link
                href={localePath(lang, `/services/${related.slug}`)}
                className="group block rounded-brand border border-line bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-primary"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t(dict, 'education.related')}</p>
                <p className="mt-3 flex items-center gap-3 font-heading text-lg font-semibold">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-primary">
                    <Icon name={related.icon} className="h-5 w-5" />
                  </span>
                  {tx(related.title, lang)}
                </p>
                <p className="mt-2 text-sm text-ink-muted">{tx(related.summary, lang)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {t(dict, 'cta.learnMore')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            )}
            <p className="rounded-brand bg-secondary-soft p-5 text-sm text-ink-muted">
              <Link href={localePath(lang, '/disclaimer')} className="font-semibold text-primary underline underline-offset-2">
                {t(dict, 'nav.disclaimer')}
              </Link>
            </p>
          </aside>
        </div>
      </section>

      <section className="section bg-surface">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">{t(dict, 'education.more')}</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {more.map((m) => (
              <li key={m.meta.slug}>
                <ArticleCard article={m} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBanner lang={lang} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MedicalWebPage',
          name: title,
          description: a.meta.summary,
          url: absoluteUrl(localePath(lang, `/patient-education/${a.meta.slug}`)),
          inLanguage: lang === 'te' ? 'te' : 'en',
          publisher: { '@id': clinicId() },
          audience: { '@type': 'Patient' },
        }}
      />
    </>
  );
}
