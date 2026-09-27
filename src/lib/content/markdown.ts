import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { z } from 'zod';
import { ArticleFrontmatter, LegalFrontmatter } from './schemas';
import { fill, type Vars } from '../i18n';

const contentDir = path.join(process.cwd(), 'content');

function readDir<T extends z.ZodTypeAny>(dir: string, schema: T) {
  const full = path.join(contentDir, dir);
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(full, file), 'utf8');
      const { data, content } = matter(raw);
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Invalid frontmatter in content/${dir}/${file}: ${issues}`);
      }
      return { meta: parsed.data as z.infer<T>, body: content, file };
    });
}

export type Article = { meta: z.infer<typeof ArticleFrontmatter>; body: string; readMinutes: number };
export type LegalPage = { meta: z.infer<typeof LegalFrontmatter>; body: string };

let articlesCache: Article[] | null = null;
export function getArticles(): Article[] {
  if (!articlesCache) {
    articlesCache = readDir('education', ArticleFrontmatter)
      .map(({ meta, body }) => ({ meta, body, readMinutes: Math.max(1, Math.round(body.split(/\s+/).length / 200)) }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }
  return articlesCache;
}
export const getArticle = (slug: string) => getArticles().find((a) => a.meta.slug === slug);

let legalCache: LegalPage[] | null = null;
export function getLegalPages(): LegalPage[] {
  if (!legalCache) legalCache = readDir('legal', LegalFrontmatter).map(({ meta, body }) => ({ meta, body }));
  return legalCache;
}
export const getLegalPage = (slug: string) => getLegalPages().find((p) => p.meta.slug === slug);

/** Markdown → HTML with {{tokens}} filled. Content is our own repo files, not user input. */
export function renderMarkdown(md: string, vars: Vars): string {
  return marked.parse(fill(md, vars), { async: false }) as string;
}
