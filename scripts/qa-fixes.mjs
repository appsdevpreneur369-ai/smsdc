// QA helper for header/hero/footer checks: node scripts/qa-fixes.mjs <baseUrl> <outDir> <label>
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3100', out = 'qa', label = 'shot'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const scrollToBottom = async (p) => {
  for (let i = 0; i < 60; i++) {
    await p.mouse.wheel({ deltaY: 2000 });
    await wait(40);
  }
  await wait(900);
};

// 1. Active nav item after a mouse click — light (top) header and dark (scrolled) header, 1280.
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' });
  const link = await p.$('header nav a[href="/doctors"]');
  await link.click();
  await p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await wait(600);
  await (await p.$('header')).screenshot({ path: `${out}/${label}-1-nav-light.png` });
  await p.mouse.wheel({ deltaY: 900 });
  await wait(700);
  const l2 = await p.$('header nav a[href="/services"]');
  await l2.click();
  await p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await p.mouse.wheel({ deltaY: 900 });
  await wait(700);
  await (await p.$('header')).screenshot({ path: `${out}/${label}-1-nav-dark.png` });
  // Keyboard: Tab into the nav and capture the focus indicator.
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' });
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
  await wait(200);
  console.log('keyboard focus on:', await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40)));
  await (await p.$('header')).screenshot({ path: `${out}/${label}-1-nav-keyboard.png` });
  await p.close();
}

// 2. Hero headline at 1280 and 360.
for (const w of [1280, 360]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 800 });
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' });
  const h1 = await p.$('#hero-heading');
  const box = await h1.boundingBox();
  await p.screenshot({ path: `${out}/${label}-2-hero-${w}.png`, clip: { x: 0, y: Math.max(0, box.y - 20), width: w, height: box.height + 140 } });
  await p.close();
}

// 3 + 4. Footer at the very bottom of the page, viewport-sized, at every width.
for (const w of [360, 390, 768, 1024, 1280, 1440]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: w < 768 ? 780 : 820 });
  await p.goto(`${base}/`, { waitUntil: 'networkidle2' });
  await scrollToBottom(p);
  await p.screenshot({ path: `${out}/${label}-3-footer-${w}.png` });
  // Does any floating control overlap footer text?
  const overlap = await p.evaluate(() => {
    // Floating controls: the desktop pills (links inside the dock) and the mobile sticky bar itself.
    const visible = (e) => {
      for (let n = e; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
      }
      return true;
    };
    const floats = [...document.querySelectorAll('div[data-floating] a, nav[data-floating]')].filter(visible);
    const texts = [...document.querySelectorAll('footer a, footer p, footer li, footer span')].filter((e) => e.children.length === 0 && e.textContent.trim());
    const hits = [];
    for (const f of floats) {
      const a = f.getBoundingClientRect();
      if (!a.width) continue;
      for (const t of texts) {
        const b = t.getBoundingClientRect();
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) hits.push(t.textContent.trim().slice(0, 30));
      }
    }
    return [...new Set(hits)];
  });
  console.log(`footer @${w}: overlapped text = ${overlap.length ? overlap.join(' | ') : 'none'}`);
  await p.close();
}
await browser.close();
