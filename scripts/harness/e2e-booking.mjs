// TEST-ONLY end-to-end checks of the booking popup against a production build.
// Usage: node scripts/harness/e2e-booking.mjs <baseUrl> <outDir> <suite>
//   suites: clinicflow (mock API, scenario ok) | errors-500 | errors-429 | enquiry | fallback (real staging config)
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:3100', out = 'qa-booking', suite = 'clinicflow'] = process.argv.slice(2);
const MOCK = 'http://localhost:4010/api/v1';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

async function fresh(width = 1280, height = 820) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
  const logs = [];
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e}`));
  return { ctx, page, logs };
}
const dialog = (page) => page.$('[data-booking-dialog]');
const waitDialog = (page, timeout = 15000) => page.waitForSelector('[data-booking-dialog]', { timeout });
const waitNoDialog = (page) => page.waitForFunction(() => !document.querySelector('[data-booking-dialog]'), { timeout: 5000 });
const inDialog = (page, sel) => page.$(`[data-booking-dialog] ${sel}`);
const byLabel = (page, text) =>
  page.evaluateHandle((t) => {
    const l = [...document.querySelectorAll('[data-booking-dialog] label, form label')].find((x) => x.textContent.trim().startsWith(t));
    return l ? document.getElementById(l.htmlFor) : null;
  }, text);
async function selectByLabel(page, label, pick) {
  const el = await byLabel(page, label);
  const value = await el.evaluate((s, pick) => {
    const opts = [...s.options].filter((o) => o.value);
    const o = typeof pick === 'string' ? opts.find((x) => x.value === pick || x.textContent.includes(pick)) : opts[pick ?? 0];
    return o?.value;
  }, pick);
  await el.evaluate((s, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(s, v);
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  return value;
}
async function typeInto(page, label, text) {
  const el = await byLabel(page, label);
  await el.click({ clickCount: 3 });
  await el.type(text);
}
async function fillForm(page, { treatment = 'Root canal treatment', dateIndex = 0, timeIndex = 0 } = {}) {
  await typeInto(page, 'Full Name', 'Lakshmi Prasanna');
  await typeInto(page, 'Phone Number', '94414 11629');
  await typeInto(page, 'Email', 'lakshmi@example.com');
  await selectByLabel(page, 'Treatment', treatment);
  await wait(200);
  const date = await selectByLabel(page, 'Choose Date', dateIndex);
  await page.waitForFunction(() => {
    const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim().startsWith('Choose Time') || x.textContent.trim().startsWith('Preferred time'));
    const s = l && document.getElementById(l.htmlFor);
    return s && !s.disabled && s.options.length > 1;
  }, { timeout: 10000 });
  const time = await selectByLabel(page, (await page.$eval('body', () => (document.body.innerText.includes('Choose Time') ? 'Choose Time' : 'Preferred time'))), timeIndex);
  const consent = await page.$('[data-booking-dialog] input[type=checkbox], form input[type=checkbox]');
  if (!(await consent.evaluate((c) => c.checked))) await consent.click();
  return { date, time };
}

// ─────────────────────────────────────────────────────────────────────────────
if (suite === 'clinicflow') {
  // 1. Auto-open timing, desktop modal, dialog semantics, scroll lock
  {
    const { ctx, page, logs } = await fresh(1280);
    const t0 = Date.now();
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    check('no dialog on page load', !(await dialog(page)));
    await wait(5000);
    check('still closed after 5s', !(await dialog(page)));
    await waitDialog(page, 12000);
    const ms = Date.now() - t0;
    check('auto-opens after ~8s', ms >= 7500 && ms < 13000, `${(ms / 1000).toFixed(1)}s after navigation`);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'), { timeout: 10000 });
    await wait(500);
    const a11y = await page.$eval('[data-booking-dialog]', (d) => ({
      role: d.getAttribute('role'),
      modal: d.getAttribute('aria-modal'),
      labelled: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent,
      focusInside: d.contains(document.activeElement),
      overflow: getComputedStyle(document.body).overflow,
    }));
    check('dialog semantics', a11y.role === 'dialog' && a11y.modal === 'true' && a11y.labelled === 'Book Your Appointment', JSON.stringify(a11y));
    check('focus moved into the dialog', a11y.focusInside);
    check('background scroll locked', a11y.overflow === 'hidden');
    check('booking mode = clinicflow (branch read-only from API)', await page.evaluate(() => [...document.querySelectorAll('input[readonly]')].some((i) => i.value.includes('Tadepalle'))));
    await page.screenshot({ path: `${out}/01-desktop-modal.png` });
    await page.keyboard.press('Escape');
    await waitNoDialog(page);
    check('ESC closes', !(await dialog(page)));
    check('sessionStorage flag = closed', (await page.evaluate(() => sessionStorage.getItem('smsdc.bookingPopup'))) === 'closed');
    await page.goto(`${base}/about`, { waitUntil: 'networkidle2' });
    await wait(10000);
    check('never auto-opens again in the session after close', !(await dialog(page)));
    check('no console errors', !logs.some((l) => (l.startsWith('error') && !l.includes('Failed to load resource')) || l.startsWith('pageerror')), logs.filter((l) => l.startsWith('error')).join(' | '));
    await ctx.close();
  }

  // 2. Excluded path never auto-opens
  {
    const { ctx, page } = await fresh(1280);
    await page.goto(`${base}/privacy`, { waitUntil: 'networkidle2' });
    await wait(10000);
    check('/privacy: no auto-open', !(await dialog(page)));
    await page.goto(`${base}/book`, { waitUntil: 'networkidle2' });
    await wait(9500);
    check('/book: no auto-open (full-page form instead)', !(await dialog(page)) && (await page.$('form[data-variant="page"]')) !== null);
    await ctx.close();
  }

  // 3. Every Book button opens the same modal; X closes; focus returns to the opener; prefill
  {
    const { ctx, page } = await fresh(1280);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    const buttons = [
      ['hero', 'main section a[href="/book"]'],
      ['floating pill', 'div[data-floating] a[href="/book"]'],
      ['CTA banner', 'section[aria-labelledby="cta-heading"] a[href="/book"]'],
    ];
    for (const [name, sel] of buttons) {
      const el = await page.$(sel);
      if (!el) {
        check(`${name} Book button exists`, false);
        continue;
      }
      await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await wait(300);
      await el.click();
      await waitDialog(page, 4000).catch(() => {});
      const opened = !!(await dialog(page));
      await (await inDialog(page, 'button[aria-label="Close"]'))?.click();
      await waitNoDialog(page).catch(() => {});
      await wait(250);
      const refocused = await el.evaluate((e) => document.activeElement === e);
      check(`${name} Book button opens the modal; X closes; focus returns`, opened && refocused);
    }
    check('manual open blocks later auto-open', ['opened', 'closed'].includes(await page.evaluate(() => sessionStorage.getItem('smsdc.bookingPopup'))));
    // Doctor page prefill
    await page.goto(`${base}/doctors/dr-preethi`, { waitUntil: 'networkidle2' });
    await (await page.$('main a[href="/book?doctor=dr-preethi"]')).click();
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
    const t = await (await byLabel(page, 'Treatment')).evaluate((s) => s.options[s.selectedIndex]?.textContent);
    check('doctor page pre-selects a treatment that doctor treats', /Wisdom|extraction|surgery|implant/i.test(t || ''), t);
    await selectByLabel(page, 'Choose Date', 0);
    await page.waitForFunction(() => [...document.querySelectorAll('option')].some((o) => /PM|AM/.test(o.textContent)), { timeout: 8000 });
    const withNames = await page.$$eval('option', (os) => os.map((o) => o.textContent).filter((x) => / — Dr\./.test(x)).length);
    check('preferred doctor narrows slots to that doctor (no merged names)', withNames === 0);
    await page.keyboard.press('Escape');
    // Treatment page prefill + merged slots for two surgeons
    await page.goto(`${base}/services/oral-surgery`, { waitUntil: 'networkidle2' });
    await (await page.$('main a[href="/book?treatment=oral-surgery"]')).click();
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
    const t2 = await (await byLabel(page, 'Treatment')).evaluate((s) => s.options[s.selectedIndex]?.textContent);
    check('treatment page pre-selects its treatment', /Wisdom tooth removal/.test(t2 || ''), t2);
    await selectByLabel(page, 'Choose Date', 0);
    await page.waitForFunction(() => [...document.querySelectorAll('option')].some((o) => / — Dr\./.test(o.textContent)), { timeout: 8000 }).catch(() => {});
    const merged = await page.$$eval('option', (os) => [...new Set(os.map((o) => o.textContent).filter((x) => / — Dr\./.test(x)).map((x) => x.split(' — ')[1]))]);
    check('multi-doctor treatment merges slots and names each doctor', merged.length >= 2, merged.join(', '));
    await page.screenshot({ path: `${out}/02-merged-slots.png` });
    // Backdrop click: empty → closes; typed → discard confirm
    await page.keyboard.press('Escape');
    await waitNoDialog(page);
    await (await page.$('main a[href="/book?treatment=oral-surgery"]')).click();
    await waitDialog(page);
    await page.mouse.click(20, 400);
    await wait(500);
    const discard1 = await page.evaluate(() => !!document.querySelector('[role="alertdialog"]'));
    await ctx.close();
    const { ctx: c2, page: p2 } = await fresh(1280);
    await p2.goto(`${base}/services/dentures`, { waitUntil: 'networkidle2' });
    await (await p2.$('main a[href="/book?treatment=dentures"]')).click();
    await waitDialog(p2);
    await p2.waitForFunction(() => document.body.innerText.includes('Full Name'));
    await p2.mouse.click(20, 400);
    await wait(500);
    check('backdrop click with a pre-filled treatment asks before discarding', discard1 || (await p2.evaluate(() => !!document.querySelector('[role="alertdialog"]'))));
    await (await p2.$('[role="alertdialog"] button'))?.click(); // Keep editing
    await wait(300);
    check('"Keep editing" keeps the dialog open', !!(await dialog(p2)));
    await p2.screenshot({ path: `${out}/03-discard-confirm-dismissed.png` });
    await c2.close();
  }

  // 4. Validation, keyboard-only booking, OTP (wrong then right), success
  {
    const { ctx, page, logs } = await fresh(1280);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    // Keyboard: Tab to the hero Book button and press Enter
    await page.focus('main section a[href="/book"]');
    await page.keyboard.press('Enter');
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
    // Submit empty → inline errors + first invalid field focused
    const submitBtn = await inDialog(page, 'button[type=submit]');
    await submitBtn.click();
    await wait(300);
    const v = await page.evaluate(() => ({
      errors: [...document.querySelectorAll('[data-booking-dialog] p[id$="-err"]')].map((p) => p.textContent),
      focus: document.activeElement?.getAttribute('autocomplete'),
    }));
    check('submit with empty form shows inline errors', v.errors.length >= 5, v.errors.slice(0, 3).join(' | '));
    check('first invalid field gets focus', v.focus === 'name');
    await page.screenshot({ path: `${out}/04-validation.png` });
    // Blur validation on the phone field
    await typeInto(page, 'Phone Number', '12345');
    await page.keyboard.press('Tab');
    await wait(200);
    check('phone validated on blur', (await page.evaluate(() => document.body.innerText)).includes('Enter a valid 10-digit Indian mobile number'));
    // Keyboard-only fill: type into fields, use arrow keys in selects
    const kb = async (label, text) => {
      const el = await byLabel(page, label);
      await el.focus();
      await el.evaluate((i) => i.select()); // select existing text, then replace it by typing
      await page.keyboard.type(text);
    };
    await kb('Full Name', 'Lakshmi Prasanna');
    await kb('Phone Number', '+91 94414 11629');
    await kb('Email', 'lakshmi@example.com');
    const arrow = async (label, n) => {
      await (await byLabel(page, label)).focus();
      for (let i = 0; i < n; i++) await page.keyboard.press('ArrowDown');
      await wait(250);
    };
    await arrow('Treatment', 4); // General check-up … → a routing problem option
    await arrow('Choose Date', 1);
    await page.waitForFunction(() => [...document.querySelectorAll('option')].some((o) => /PM|AM/.test(o.textContent)), { timeout: 8000 });
    await arrow('Choose Time', 1);
    const consent = await inDialog(page, 'input[type=checkbox]');
    await consent.focus();
    await page.keyboard.press('Space');
    const filled = await page.evaluate(() => [...document.querySelectorAll('[data-booking-dialog] select')].map((s) => s.value));
    check('keyboard-only: treatment, date and time chosen with arrow keys', filled.every(Boolean), filled.join(' / '));
    await (await inDialog(page, 'button[type=submit]')).focus();
    await page.keyboard.press('Enter');
    try {
      await page.waitForFunction(() => document.body.innerText.includes('Verify your phone number'), { timeout: 8000 });
    } catch (e) {
      console.log('DEBUG dialog text:', await page.$eval('[data-booking-dialog]', (d) => d.innerText.replace(/\s+/g, ' ').slice(0, 1500)));
      console.log('DEBUG values:', await page.$eval('[data-booking-dialog] input, [data-booking-dialog] select', (els) => Array.from(els).map((e) => e.type === 'checkbox' ? e.checked : e.value).join(' | ')));
      await page.screenshot({ path: `${out}/debug-kb.png` });
      throw e;
    }
    const otpText = await page.evaluate(() => document.body.innerText);
    check('OTP step shows the masked number', otpText.includes('+91 XXXXX X1629'));
    check('OTP input focused', await page.evaluate(() => document.activeElement?.getAttribute('autocomplete') === 'one-time-code'));
    check('resend countdown running', /Resend code in \d+s/.test(otpText));
    await page.screenshot({ path: `${out}/05-otp-step.png` });
    await page.keyboard.type('111111');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes("didn't match"), { timeout: 8000 });
    check('wrong OTP → inline error, stays on OTP step', true);
    await page.screenshot({ path: `${out}/06-otp-wrong.png` });
    const otpInput = await inDialog(page, 'input[autocomplete="one-time-code"]');
    await otpInput.evaluate((i) => i.select());
    await page.keyboard.type('123456');
    await page.keyboard.press('Enter');
    try {
      await page.waitForFunction(() => document.body.innerText.includes('Appointment requested'), { timeout: 10000 });
    } catch (e) {
      console.log('DEBUG after 123456:', await page.$eval('[data-booking-dialog]', (d) => d.innerText.replace(/s+/g, ' ').slice(0, 800)));
      console.log('DEBUG otp value:', await page.$eval('[data-booking-dialog] input[autocomplete="one-time-code"]', (i) => i.value).catch(() => 'n/a'));
      console.log('DEBUG logs:', logs.slice(-6).join(' || '));
      throw e;
    }
    const success = await page.evaluate(() => document.body.innerText);
    check('success shows doctor, date, time, status from the API', /Dr\. /.test(success) && /CONFIRMED/.test(success) && /(AM|PM)/.test(success));
    check('success offers Add to calendar + Get directions + Done', ['Add to calendar', 'Get directions', 'Done'].every((x) => success.includes(x)));
    check('booked flag set', (await page.evaluate(() => sessionStorage.getItem('smsdc.bookingPopup'))) === 'booked');
    await page.screenshot({ path: `${out}/07-success.png` });
    const mockLog = await (await fetch(`${MOCK.replace('/api/v1', '')}/api/v1/__log`)).json();
    check('guest-book POST went straight from the browser to the API', mockLog.log.some((l) => l.startsWith('POST /api/v1/appointments/guest-book')));
    check('GETs went through the same-origin proxy', mockLog.log.some((l) => l.startsWith('GET /api/v1/clinics/') && l.includes('/slots')));
    check('no console errors', !logs.some((l) => (l.startsWith('error') && !l.includes('Failed to load resource')) || l.startsWith('pageerror')), logs.filter((l) => l.startsWith('error')).join(' | '));
    await ctx.close();
  }

  // 5. Slot taken between form and OTP → friendly message, slots reloaded, data kept
  {
    const { ctx, page } = await fresh(1280);
    await page.goto(`${base}/services/root-canal-treatment`, { waitUntil: 'networkidle2' });
    await (await page.$('main a[href="/book?treatment=root-canal-treatment"]')).click();
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
    const { date, time } = await fillForm(page, { treatment: 'Root canal treatment', dateIndex: 1, timeIndex: 0 });
    await (await inDialog(page, 'button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('Verify your phone number'), { timeout: 8000 });
    const [hhmm, doctorSlug] = time.split('|');
    const doctors = await (await fetch(`${MOCK}/clinics/5a1c0000-0000-4000-8000-000000000001/doctors`)).json();
    const doc = doctors.find((d) => d.firstName === 'Naveen');
    await fetch(`${MOCK.replace('/api/v1', '')}/api/v1/__take`, { method: 'POST', body: JSON.stringify({ doctorId: doc.id, date, startTime: `${hhmm}:00` }) });
    await (await inDialog(page, 'input[autocomplete="one-time-code"]')).type('123456');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes('That time was just booked'), { timeout: 10000 });
    const state = await page.evaluate(() => ({
      name: [...document.querySelectorAll('input')].find((i) => i.autocomplete === 'name')?.value,
      date: [...document.querySelectorAll('[data-booking-dialog] select')][1]?.value,
      time: [...document.querySelectorAll('[data-booking-dialog] select')][2]?.value,
      hasTaken: [...document.querySelectorAll('option')].some((o) => o.value.startsWith(`${document.querySelectorAll('select')[3]?.value}`) && false),
    }));
    const stillOffered = await page.$$eval('option', (os, v) => os.some((o) => o.value === v), `${hhmm}|${doctorSlug}`);
    check('slot taken → message, back on the form, name/date kept, time cleared', state.name === 'Lakshmi Prasanna' && state.date === date && !state.time, JSON.stringify(state));
    check('slots reloaded without the taken time', !stillOffered);
    await page.screenshot({ path: `${out}/08-slot-taken.png` });
    await ctx.close();
  }

  // 6. Mobile sheet (390 and 360) + mobile bar Book button + mobile menu interaction
  for (const w of [390, 360]) {
    const { ctx, page } = await fresh(w, 844);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await waitDialog(page, 14000);
    await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
    await wait(600);
    const g = await page.$eval('[data-booking-dialog]', (d) => {
      const r = d.getBoundingClientRect();
      const scroller = d.querySelector('.overflow-y-auto');
      return { top: Math.round(r.top), height: Math.round(r.height), vh: innerHeight, scrolls: scroller.scrollHeight > scroller.clientHeight };
    });
    check(`mobile ${w}: full-height sheet with scrollable form`, g.top === 0 && g.height === g.vh && g.scrolls, JSON.stringify(g));
    await page.screenshot({ path: `${out}/09-mobile-sheet-${w}.png` });
    await (await inDialog(page, 'button[aria-label="Close"]')).click();
    await waitNoDialog(page);
    await wait(400);
    await (await page.$('nav[data-floating] a[href="/book"]')).tap();
    await waitDialog(page, 4000).catch(() => {});
    check(`mobile ${w}: sticky bar Book opens the sheet`, !!(await dialog(page)));
    await ctx.close();
  }
  {
    // Mobile menu open when the timer fires → popup waits until it closes
    const { ctx, page } = await fresh(390, 844);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await page.click('button[aria-controls="mobile-menu"]');
    await wait(9500);
    const whileMenu = !!(await dialog(page));
    await page.keyboard.press('Escape');
    await waitDialog(page, 4000).catch(() => {});
    check('auto-open waits for the mobile menu to close, then opens', !whileMenu && !!(await dialog(page)));
    await ctx.close();
  }
  {
    // Reduced motion: fade only (no transform on the panel)
    const { ctx, page } = await fresh(1280);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await (await page.$('main section a[href="/book"]')).click();
    await waitDialog(page);
    const tf = await page.$eval('[data-booking-dialog]', (d) => d.style.transform || getComputedStyle(d).transform);
    check('reduced motion: no scale/slide on the panel', !tf || tf === 'none', tf);
    await ctx.close();
  }
  {
    // Private-mode-like storage failure must not break the site
    const { ctx, page, logs } = await fresh(1280);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('SecurityError: storage disabled'); } });
    });
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await (await page.$('main section a[href="/book"]')).click();
    await waitDialog(page, 4000).catch(() => {});
    check('storage blocked: site and popup still work', !!(await dialog(page)) && !logs.some((l) => l.startsWith('pageerror')));
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (suite === 'errors-500' || suite === 'errors-429') {
  const { ctx, page } = await fresh(1280);
  await page.goto(`${base}/services/root-canal-treatment`, { waitUntil: 'networkidle2' });
  await (await page.$('main a[href="/book?treatment=root-canal-treatment"]')).click();
  await waitDialog(page);
  await page.waitForFunction(() => document.body.innerText.includes('Choose Date'));
  await fillForm(page, { treatment: 'Root canal treatment', dateIndex: 2 });
  await (await inDialog(page, 'button[type=submit]')).click();
  await page.waitForFunction(() => document.body.innerText.includes('Verify your phone number'), { timeout: 8000 });
  await (await inDialog(page, 'input[autocomplete="one-time-code"]')).type('123456');
  await page.keyboard.press('Enter');
  const expect = suite === 'errors-500' ? 'The booking system had a problem' : 'Too many booking attempts';
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 10000 }, expect);
  const wa = await page.$eval('[data-booking-dialog] a[href^="https://wa.me/"]', (a) => decodeURIComponent(a.href));
  check(`${suite}: plain message + "WhatsApp us instead" prefilled with the details`, wa.includes('Lakshmi Prasanna') && wa.includes('Root canal treatment') && wa.includes('+91 9441411629'));
  check(`${suite}: nothing lost (still on the OTP step with the code)`, (await page.$eval('[data-booking-dialog] input[autocomplete="one-time-code"]', (i) => i.value)) === '123456');
  await page.screenshot({ path: `${out}/10-error-${suite.split('-')[1]}.png` });
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
if (suite === 'enquiry') {
  const { ctx, page, logs } = await fresh(1280);
  await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
  await (await page.$('main section a[href="/book"]')).click();
  await waitDialog(page);
  await page.waitForFunction(() => document.body.innerText.includes('Send request'), { timeout: 10000 });
  check('enquiry mode: explains it is a request, button says "Send request"', (await page.evaluate(() => document.body.innerText)).includes('the clinic will call you to confirm a time'));
  check('fallback reason logged in console', logs.some((l) => l.includes('[booking] using "enquiry" mode') && l.includes('no active branches')), logs.find((l) => l.includes('[booking]')));
  await fillForm(page, { treatment: 'Scaling & polishing', dateIndex: 1 });
  await page.screenshot({ path: `${out}/11-enquiry-form.png` });
  await (await inDialog(page, 'button[type=submit]')).click();
  await page.waitForFunction(() => document.body.innerText.includes('Request received'), { timeout: 10000 });
  const txt = await page.evaluate(() => document.body.innerText);
  check('enquiry success says request received (not "booked"/"confirmed")', txt.includes("we'll call you to confirm a time") && !/CONFIRMED|confirmed this appointment/.test(txt));
  await page.screenshot({ path: `${out}/12-enquiry-success.png` });
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────────
if (suite === 'fallback') {
  // Real config pointing at ClinicFlow staging: clinic not onboarded + CORS → WhatsApp fallback
  for (const w of [1280, 390]) {
    const { ctx, page, logs } = await fresh(w, w < 640 ? 844 : 820);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await (await page.$(w < 640 ? 'nav[data-floating] a[href="/book"]' : 'main section a[href="/book"]')).click();
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('Continue on WhatsApp'), { timeout: 15000 });
    const reason = logs.find((l) => l.includes('[booking]'));
    check(`fallback @${w}: WhatsApp mode with the reason logged`, !!reason, reason);
    await fillForm(page, { treatment: 'Bleeding or swollen gums', dateIndex: 0 });
    await page.screenshot({ path: `${out}/13-whatsapp-fallback-${w}.png` });
    const popupUrl = new Promise((r) => ctx.once('targetcreated', (t) => r(t.url())));
    await (await inDialog(page, 'button[type=submit]')).click();
    const url = decodeURIComponent(await Promise.race([popupUrl, wait(5000).then(() => '')])).replace(/[+]/g, ' ');
    check(`fallback @${w}: opens wa.me with the details, UI says "Continue on WhatsApp" (never "booked")`, (url.includes('wa.me/919441411629') || url.includes('api.whatsapp.com/send/?phone=919441411629')) && url.includes('Lakshmi Prasanna') && url.includes('Dr. Sindhu'), url.slice(0, 120));
    await page.waitForFunction(() => document.body.innerText.includes('WhatsApp has opened'), { timeout: 5000 });
    check(`fallback @${w}: no "Appointment requested/confirmed" wording`, !/(Appointment requested|CONFIRMED)/.test(await page.evaluate(() => document.body.innerText)));
    await page.screenshot({ path: `${out}/14-whatsapp-continue-${w}.png` });
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed (${suite})`);
fs.writeFileSync(`${out}/results-${suite}.json`, JSON.stringify(results, null, 2));
process.exitCode = failed.length ? 1 : 0;
