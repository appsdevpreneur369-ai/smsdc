import { categories, doctors, gallery, getImage, home } from '@/lib/content';
import { getArticles, getLegalPages } from '@/lib/content/markdown';
import { photosFor } from '@/lib/gallery';
import { localePath, locales, tx } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';

// Written by hand (not app/sitemap.ts) because Next 14's sitemap helper can't emit <image:image>.
// Generated from content at build time: every page in both languages with hreflang alternates, plus the
// photos shown on each page (image sitemap).
export const dynamic = 'force-static';

type Img = { src: string; title: string; caption: string };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pageImages(path: string): Img[] {
  const photo = (id: string): Img => {
    const img = getImage(id);
    return { src: img.src, title: tx(img.caption ?? img.alt, 'en'), caption: tx(img.alt, 'en') };
  };
  const placed = (placement: string) => photosFor(placement, 'en').map((p) => ({ src: p.src, title: p.caption, caption: p.alt }));
  if (path === '/gallery') return gallery.items.map(photo);
  if (path === '/') return [photo(home.about.image), ...placed('home')].filter((x, i, a) => a.findIndex((y) => y.src === x.src) === i && !x.src.endsWith('.svg'));
  if (path === '/about') return placed('about');
  const article = getArticles().find((a) => `/patient-education/${a.meta.slug}` === path);
  if (article?.meta.image) return [photo(article.meta.image)];
  return [];
}

export function GET() {
  const staticPaths = ['/', '/about', '/services', '/doctors', '/why-us', '/gallery', '/reviews', '/patient-education', '/faqs', '/book', '/contact', '/emergency'];
  const paths = [
    ...staticPaths,
    ...categories.map((c) => `/services/${c.slug}`),
    ...doctors.map((d) => `/doctors/${d.slug}`),
    ...getArticles().map((a) => `/patient-education/${a.meta.slug}`),
    ...getLegalPages().map((p) => `/${p.meta.slug}`),
  ];
  const priority = (p: string) => (p === '/' ? 1 : p === '/book' || p === '/services' || p === '/contact' ? 0.9 : p.startsWith('/services/') ? 0.8 : 0.6);
  const lastmod = new Date().toISOString().slice(0, 10); // build date (the site is rebuilt whenever content changes)

  const urls = paths.flatMap((path) =>
    locales.map((lang) => {
      const alt = (l: string, href: string) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(href)}"/>`;
      const images = pageImages(path).map(
        (im) => `    <image:image>\n      <image:loc>${esc(absoluteUrl(im.src))}</image:loc>\n      <image:title>${esc(im.title)}</image:title>\n      <image:caption>${esc(im.caption)}</image:caption>\n    </image:image>`,
      );
      return [
        '  <url>',
        `    <loc>${esc(absoluteUrl(localePath(lang, path)))}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '    <changefreq>monthly</changefreq>',
        `    <priority>${(lang === 'en' ? priority(path) : Math.max(0.3, priority(path) - 0.2)).toFixed(1)}</priority>`,
        alt('en-IN', absoluteUrl(localePath('en', path))),
        alt('te-IN', absoluteUrl(localePath('te', path))),
        alt('x-default', absoluteUrl(localePath('en', path))),
        ...images,
        '  </url>',
      ].join('\n');
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
