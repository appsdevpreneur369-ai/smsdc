// TEST-ONLY checks of /gallery, the lightbox and the photo placements (runs against any build).
// Usage: node scripts/harness/e2e-gallery.mjs http://localhost:3100 <outDir>
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3100', out = 'qa-gallery'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
async function fresh(width, height = 900) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height, isMobile: width < 640, hasTouch: width < 640 });
  const logs = [];
  page.on('pageerror', (e) => logs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && logs.push(m.text()));
  // Keep the booking popup from auto-opening over the gallery.
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('smsdc.bookingPopup', 'closed'));
  return { ctx, page, logs };
}
const cols = (page) => page.$eval('[data-gallery-grid]', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// 1. Layout at 360 / 768 / 1280
for (const [w, want] of [[360, 1], [768, 2], [1280, 3]]) {
  const { ctx, page } = await fresh(w);
  await page.goto(`${base}/gallery`, { waitUntil: 'networkidle2' });
  const c = await cols(page);
  check(`/gallery @${w}: ${want} column(s), no horizontal scroll`, c === want && (await noOverflow(page)), `${c} columns`);
  const thumbs = await page.$$eval('[data-gallery-grid] li', (lis) => lis.map((li) => { const r = li.querySelector('button').getBoundingClientRect(); return Math.round((r.width / r.height) * 100) / 100; }));
  check(`/gallery @${w}: every thumbnail 4:3`, thumbs.every((r) => Math.abs(r - 1.33) < 0.03), thumbs.join(' '));
  await page.screenshot({ path: `${out}/gallery-${w}.png`, fullPage: true });
  await ctx.close();
}

// 2. Filters + URL, lightbox keyboard, focus trap, focus return
{
  const { ctx, page, logs } = await fresh(1280);
  await page.goto(`${base}/gallery`, { waitUntil: 'networkidle2' });
  const all = (await page.$$('[data-gallery-grid] li')).length;
  const h1 = await page.$eval('h1', (h) => h.textContent);
  check('H1 "Our Clinic Gallery", all photos in the server HTML', h1.includes('Our Clinic Gallery') && all >= 6, `${all} photos`);
  const chips = await page.$$eval('[role=group] button', (b) => b.map((x) => x.textContent));
  check('filter chips: All + categories with photos', chips[0] === 'All' && chips.includes('Clinic'), chips.join(' · '));
  await page.evaluate(() => [...document.querySelectorAll('[role=group] button')].find((b) => b.textContent === 'Clinic').click());
  await wait(200);
  const clinicCount = (await page.$$('[data-gallery-grid] li')).length;
  check('Clinic filter narrows the grid and sets ?category=clinic without reload', clinicCount < all && page.url().endsWith('?category=clinic') && (await page.evaluate(() => performance.getEntriesByType('navigation').length)) === 1, `${clinicCount} of ${all}`);
  await page.goto(`${base}/gallery?category=education`, { waitUntil: 'networkidle2' });
  await wait(200);
  check('deep link ?category=education pre-selects the chip', (await page.$eval('[role=group] button[aria-pressed="true"]', (b) => b.textContent)) === 'Patient Education');
  await page.evaluate(() => [...document.querySelectorAll('[role=group] button')].find((b) => b.textContent === 'All').click());
  await wait(200);
  check('All clears the parameter', !page.url().includes('category='));

  const second = (await page.$$('[data-gallery-grid] li button'))[1];
  await second.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role=dialog][aria-modal=true]');
  const d1 = await page.$eval('[role=dialog]', (d) => ({ text: d.innerText, focusIn: d.contains(document.activeElement), label: d.getAttribute('aria-label') }));
  check('lightbox opens on Enter: dialog, focus inside, caption + counter "2 / N"', d1.focusIn && /\b2 \/ \d+/.test(d1.text) && d1.label === 'Photo viewer', d1.text.replace(/\s+/g, ' ').slice(0, 80));
  await page.keyboard.press('ArrowRight');
  await wait(150);
  check('→ goes to the next photo', /\b3 \/ \d+/.test(await page.$eval('[role=dialog]', (d) => d.innerText)));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await wait(150);
  check('← goes back (wraps at the ends)', /\b1 \/ \d+/.test(await page.$eval('[role=dialog]', (d) => d.innerText)));
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  check('Tab stays inside the lightbox', await page.$eval('[role=dialog]', (d) => d.contains(document.activeElement)));
  const preloaded = await page.$$eval('[role=dialog] [aria-hidden] img', (imgs) => imgs.length);
  check('neighbouring photos preloaded', preloaded >= 1, `${preloaded}`);
  await page.screenshot({ path: `${out}/lightbox-1280.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=dialog][aria-modal=true]'));
  await wait(100);
  check('Esc closes and focus returns to the photo that opened it', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Open photo')));
  check('page scroll unlocked after close', (await page.evaluate(() => document.body.style.overflow)) === '');
  check('no console errors', !logs.length, logs.join(' | '));
  await ctx.close();
}

// 3. Mobile: swipe in the lightbox, Gallery in the mobile menu
{
  const { ctx, page } = await fresh(390, 844);
  await page.goto(`${base}/gallery`, { waitUntil: 'networkidle2' });
  await (await page.$$('[data-gallery-grid] li button'))[0].tap();
  await page.waitForSelector('[role=dialog][aria-modal=true]');
  const dlg = await page.$('[role=dialog]');
  const box = await dlg.boundingBox();
  await page.touchscreen.touchStart(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.touchscreen.touchMove(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.touchscreen.touchEnd();
  await wait(200);
  check('mobile: swipe left shows the next photo', /\b2 \/ \d+/.test(await page.$eval('[role=dialog]', (d) => d.innerText)));
  await page.screenshot({ path: `${out}/lightbox-390.png` });
  await page.click('[role=dialog] button[aria-label="Close"]');
  await wait(200);
  await page.click('button[aria-controls="mobile-menu"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] a')].some((a) => a.getAttribute('href') === '/gallery'), { timeout: 8000 }).catch(() => {});
  check('mobile menu lists Gallery', await page.evaluate(() => [...document.querySelectorAll('[role=dialog] a')].some((a) => a.getAttribute('href') === '/gallery')));
  await ctx.close();
}

// 4. Placements + nav
{
  const { ctx, page } = await fresh(1280);
  await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
  const teaser = await page.evaluate(() => {
    const s = document.querySelector('[aria-labelledby="gallery-teaser-heading"]');
    return s ? { title: s.querySelector('h2')?.textContent, photos: s.querySelectorAll('li').length, viewAll: [...s.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/gallery' && /View full gallery/.test(a.textContent)) } : null;
  });
  check('home: "Inside Our Clinic" strip (4–6 photos) with "View full gallery"', teaser && teaser.title?.trim() === 'Inside Our Clinic' && teaser.photos >= 4 && teaser.photos <= 6 && teaser.viewAll, JSON.stringify(teaser));
  check('header nav + footer link to /gallery', await page.evaluate(() => !!document.querySelector('header nav a[href="/gallery"]') && !!document.querySelector('footer a[href="/gallery"]')));
  const heroLoading = await page.$eval('main img', (i) => i.getAttribute('loading'));
  check('hero image not lazy (LCP)', heroLoading !== 'lazy', String(heroLoading));
  await page.goto(`${base}/about`, { waitUntil: 'networkidle2' });
  check('about: clinic photos next to the story', (await page.$$eval('main img', (imgs) => imgs.filter((i) => i.src.includes('suhasini-dental-clinic')).length)) >= 1);
  await page.goto(`${base}/patient-education/healthy-gums-healthy-heart`, { waitUntil: 'networkidle2' });
  const art = await page.evaluate(() => ({
    poster: [...document.querySelectorAll('article img')].some((i) => i.src.includes('healthy-gums-healthy-heart-poster')),
    og: document.querySelector('meta[property="og:image"]')?.content,
    text: document.querySelector('article').innerText,
  }));
  check('article: poster as main image, share card as og:image, key points as HTML text', art.poster && art.og.includes('healthy-gums-healthy-heart-og') && /bloodstream/.test(art.text) && /[Ss]moking/.test(art.text), art.og);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} gallery checks passed`);
process.exitCode = failed.length ? 1 : 0;
