// TEST-ONLY SEO audit of a running build: every URL in /sitemap.xml (both languages).
// Usage: node scripts/harness/seo-audit.mjs http://localhost:3100 [outFile.json]
// Checks: title 35–60 chars + unique, description 120–160 + unique (within a language: /x and /te/x are
// hreflang alternates and may share the English fallback text), exactly one <h1>, no skipped heading
// levels, canonical (absolute, same page), html lang, OG/Twitter tags + image, JSON-LD parses (types listed),
// every <img> has alt, and every internal <a href> resolves (no 4xx/5xx), sitemap images resolve.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3100', outFile] = process.argv.slice(2);
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapImages = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
const rows = [];
const links = new Set();
const titles = new Map();
const descs = new Map();

for (const u of urls) {
  const url = u.replace(/^https?:\/\/[^/]+/, base); // the sitemap uses NEXT_PUBLIC_SITE_URL
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
  const d = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const meta = (s) => q(s)?.getAttribute('content') || '';
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !h.closest('[aria-hidden="true"]')).map((h) => Number(h.tagName[1]));
    let skip = '';
    for (let i = 1; i < heads.length; i++) if (heads[i] > heads[i - 1] + 1) { skip = `h${heads[i - 1]}→h${heads[i]}`; break; }
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        const j = JSON.parse(s.textContent);
        return [].concat(j['@type']).join('+');
      } catch {
        return 'INVALID-JSON';
      }
    });
    return {
      lang: document.documentElement.lang,
      title: document.title,
      desc: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      canonical: q('link[rel="canonical"]')?.href || '',
      h1: document.querySelectorAll('h1').length,
      skip,
      ogTitle: meta('meta[property="og:title"]'),
      ogImage: meta('meta[property="og:image"]'),
      twitter: meta('meta[name="twitter:card"]'),
      ld,
      noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src).slice(0, 3),
      hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/') && !h.startsWith('//')),
      emptyLinks: [...document.querySelectorAll('a[href]')].filter((a) => !(a.textContent.trim() || a.getAttribute('aria-label') || a.querySelector('img[alt]:not([alt=""]),svg[aria-label]'))).length,
    };
  });
  d.hrefs.forEach((h) => links.add(h.split('#')[0]));
  const path = new URL(url).pathname;
  const issues = [];
  if (res.status() !== 200) issues.push(`status ${res.status()}`);
  if (d.title.length < 35 || d.title.length > 60) issues.push(`title ${d.title.length} chars`);
  if (d.desc.length < 120 || d.desc.length > 160) issues.push(`description ${d.desc.length} chars`);
  if (d.h1 !== 1) issues.push(`${d.h1} h1`);
  if (d.skip) issues.push(`heading skip ${d.skip}`);
  if (!d.canonical || new URL(d.canonical).pathname !== path) issues.push(`canonical ${d.canonical || 'missing'}`);
  if (!d.lang) issues.push('no html lang');
  if (!d.ogTitle || !d.ogImage) issues.push('og missing');
  if (d.twitter !== 'summary_large_image') issues.push('twitter card');
  if (d.ld.includes('INVALID-JSON')) issues.push('invalid JSON-LD');
  if (d.noAlt.length) issues.push(`img without alt ${d.noAlt.join(' ')}`);
  if (d.emptyLinks) issues.push(`${d.emptyLinks} link(s) without a name`);
  if (/noindex/.test(d.robots)) issues.push(`robots ${d.robots}`);
  const lk = path.startsWith('/te') ? 'te' : 'en';
  titles.set(`${lk}|${d.title}`, [...(titles.get(`${lk}|${d.title}`) || []), path]);
  descs.set(`${lk}|${d.desc}`, [...(descs.get(`${lk}|${d.desc}`) || []), path]);
  rows.push({ path, lang: d.lang, title: d.title, titleLen: d.title.length, descLen: d.desc.length, h1: d.h1, ld: d.ld.join(', '), issues });
}

// Duplicates
for (const [t, ps] of titles) if (ps.length > 1) rows.filter((r) => ps.includes(r.path)).forEach((r) => r.issues.push(`duplicate title (${ps.length})`));
for (const [t, ps] of descs) if (ps.length > 1) rows.filter((r) => ps.includes(r.path)).forEach((r) => r.issues.push(`duplicate description (${ps.length})`));

// Internal link + sitemap image check
const broken = [];
for (const h of [...links].sort()) {
  const r = await fetch(`${base}${h}`, { redirect: 'manual' });
  if (r.status >= 400) broken.push(`${r.status} ${h}`);
}
for (const im of sitemapImages) {
  const r = await fetch(im.replace(/^https?:\/\/[^/]+/, base));
  if (r.status !== 200) broken.push(`${r.status} sitemap image ${im}`);
}
await browser.close();

const bad = rows.filter((r) => r.issues.length);
for (const r of rows) console.log(`${r.issues.length ? 'FIX ' : 'ok  '} ${r.path.padEnd(48)} t${String(r.titleLen).padStart(3)} d${String(r.descLen).padStart(3)} h1:${r.h1}  ${r.issues.join('; ')}`);
console.log(`\n${rows.length} pages, ${bad.length} with issues; ${links.size} internal links checked, ${sitemapImages.length} sitemap images; broken: ${broken.length ? broken.join(', ') : 'none'}`);
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ rows, broken }, null, 2));
