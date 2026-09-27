import { notFound } from 'next/navigation';
import { FileWarning } from 'lucide-react';
import { getLegalPage, renderMarkdown } from '@/lib/content/markdown';
import { getDict, t, type Lang } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { siteVars } from '@/lib/vars';
import { fill } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';

export function legalMetadata(slug: string, lang: Lang) {
  const p = getLegalPage(slug);
  if (!p) return {};
  const vars = siteVars(lang);
  return pageMetadata({ lang, path: `/${slug}`, title: p.meta.title, description: fill(p.meta.description, vars) });
}

/** Legal pages are Markdown in content/legal; every draft carries a visible "pending review" banner. */
export function LegalPage({ slug, lang }: { slug: string; lang: Lang }) {
  const p = getLegalPage(slug);
  if (!p) notFound();
  const dict = getDict(lang);
  const vars = siteVars(lang);
  return (
    <>
      <PageHeader lang={lang} crumbs={[{ name: p.meta.title, path: `/${slug}` }]} heading={p.meta.title} intro={fill(p.meta.description, vars)}>
        <p className="mt-5 text-sm text-ink-muted">
          {t(dict, 'common.lastUpdated')}: <time dateTime={p.meta.lastUpdated}>{p.meta.lastUpdated}</time>
        </p>
      </PageHeader>
      <section className="section">
        <div className="container max-w-3xl">
          {p.meta.status === 'placeholder' && (
            <p role="note" className="mb-10 flex items-center gap-3 rounded-2xl border border-dashed border-accent-text/50 bg-accent/10 p-4 font-semibold text-accent-text">
              <FileWarning className="h-5 w-5 shrink-0" aria-hidden />
              {t(dict, 'common.legalDraft')}
            </p>
          )}
          <div className="prose-clinic" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body, vars) }} />
        </div>
      </section>
    </>
  );
}
