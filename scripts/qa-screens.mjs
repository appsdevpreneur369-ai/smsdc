// QA helper: full-page screenshots + horizontal-overflow / tap-target checks at several widths.
// Usage: node scripts/qa-screens.mjs <baseUrl> <outDir> <path,path,...> [widths]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3100', outDir = 'qa', pathsArg = '/', widthsArg = '360,1280'] = process.argv.slice(2);
const paths = pathsArg.split(',');
const widths = widthsArg.split(',').map(Number);
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});
const report = [];
for (const p of paths) {
  for (const w of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: w < 768 ? 800 : 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base + p, { waitUntil: 'networkidle2', timeout: 60000 });
    // Scroll through so lazy images load, then reveal everything so full-page shots show content.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); }))));
    });
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.remove('reveal-pending')));
    await new Promise((r) => setTimeout(r, 900));
    const info = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const vw = window.innerWidth;
      const offenders = [];
      if (docW > vw) {
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        });
      }
      const small = [];
      document.querySelectorAll('a[href], button, input, select, textarea').forEach((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (r.width === 0 || s.visibility === 'hidden' || s.display === 'none') return;
        // Inline links inside running text are exempt from the 44px rule (WCAG 2.5.8 exception).
        const inline = s.display === 'inline' && el.closest('p, li') && !el.closest('nav, footer');
        if (!inline && (r.height < 40 || r.width < 40)) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      });
      return { docW, vw, offenders: offenders.slice(0, 8), small: [...new Set(small)].slice(0, 12), h: document.documentElement.scrollHeight };
    });
    const file = path.join(outDir, `${p.replace(/\//g, '_') || '_'}-${w}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({ path: p, width: w, overflow: info.docW > info.vw, ...info, errors: errors.slice(0, 5), file });
    await page.close();
  }
}
await browser.close();
for (const r of report) {
  console.log(`${r.path} @${r.width}: ${r.overflow ? `OVERFLOW ${r.docW}px` : 'ok'} h=${r.h}${r.errors.length ? ` ERR ${r.errors.join(' | ')}` : ''}`);
  if (r.offenders.length) console.log('   overflow:', r.offenders.join(', '));
  if (r.small.length) console.log('   small targets:', r.small.join('; '));
}
