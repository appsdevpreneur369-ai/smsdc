// TEST-ONLY end-to-end checks of the booking popup against a production build.
// Usage: node scripts/harness/e2e-booking.mjs <baseUrl> <outDir> <suite>
//   suites: clinicflow (mock API, scenario ok) | account (mock API: patient sign-up/in, booking, My appointments)
//           | errors-500 | errors-429 | enquiry | fallback (real staging config)
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
      await wait(1000); // let the scroll-reveal slide-in (0.7 s) finish, or the click can land on a moving button
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

// ─────────────────────────────────────────────────────────────────────────────
// Patient accounts (mock API, scenario ok): sign up once, book without OTP, My appointments, cancel,
// sign out / in, wrong password, staff account refused, duplicate email, forgot password.
if (suite === 'account') {
  const email = `lakshmi.${Date.now()}@mock.test`;
  const password = 'Secret123';
  const text = (page) => page.evaluate(() => document.body.innerText);
  const mockLog = async () => (await fetch(`${MOCK}/__log`)).json();
  const noErrors = (logs) => !logs.some((l) => (l.startsWith('error') && !l.includes('Failed to load resource')) || l.startsWith('pageerror'));
  const authInput = (page, ac) => page.$(`[data-auth-view] input[autocomplete="${ac}"]`);
  async function typeAuth(page, sel, value) {
    const el = await page.$(`[data-auth-view] ${sel}`);
    await el.click({ clickCount: 3 });
    await el.evaluate((i) => i.select());
    await el.type(value);
  }
  const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  // 1. Popup: choose account, sign up inside the popup, book without OTP
  {
    const { ctx, page, logs } = await fresh(1280);
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    check('header shows "Sign in" when signed out', (await page.$('[data-account-link="signed-out"]')) !== null);
    await page.click('main section a[href="/book"]');
    await waitDialog(page);
    await page.waitForFunction(() => document.body.innerText.includes('How would you like to book?'), { timeout: 15000 });
    check('booking asks guest vs account; guest is the default when signed out', (await page.$('[data-who="guest"]')) !== null);
    await page.evaluate(() => [...document.querySelectorAll('[data-booking-dialog] label')].find((l) => l.textContent.includes('Sign in / Create account')).click());
    await page.waitForSelector('[data-auth-view="signup"]');
    check('account mode shows the sign-up panel; guest name/phone/email fields hidden', (await page.$('form[data-variant] input[autocomplete="name"]')) === null);
    await page.screenshot({ path: `${out}/20-account-signup-in-popup.png` });

    // Pick treatment/date/time first, then try to book without signing in
    await selectByLabel(page, 'Treatment', 'Root canal treatment');
    await wait(200);
    const date = await selectByLabel(page, 'Choose Date', 1);
    await page.waitForFunction(() => [...document.querySelectorAll('form[data-variant] option')].some((o) => /PM|AM/.test(o.textContent)), { timeout: 10000 });
    const time = await selectByLabel(page, 'Choose Time', 0);
    await (await page.$('form[data-variant] input[type=checkbox]')).click();
    await (await page.$('form[data-variant] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('Please sign in or create an account first'), { timeout: 5000 });
    check('booking without signing in → asks to sign in (nothing sent)', !(await mockLog()).log.some((l) => l.includes('/slots/lock')));

    // Sign-up validation, then a real sign-up
    await typeAuth(page, 'input[autocomplete="name"]', 'Lakshmi Prasanna');
    await typeAuth(page, 'input[type=tel]', '94414 11629');
    await typeAuth(page, 'input[type=email]', email);
    await typeAuth(page, 'input[autocomplete="new-password"]', 'short');
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await wait(300);
    const v = await text(page);
    check('sign-up validation: short password + consent required', v.includes('Password must be at least 8 characters') && v.includes('Please agree so we can contact you'));
    await typeAuth(page, 'input[autocomplete="new-password"]', password);
    await (await page.$('[data-auth-view] input[type=checkbox]')).click();
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForSelector('[data-signed-in]', { timeout: 8000 });
    const signed = await text(page);
    check('signed up once → signed in straight away (name + email shown)', signed.includes('Signed in as Lakshmi Prasanna') && signed.includes(email));
    check('email-only notice shown', signed.includes('confirmations and reminders are sent to your email'));
    check('treatment/date/time kept through sign-up', (await page.$eval('form[data-variant]', (f) => [...f.querySelectorAll('select')].map((s) => s.value).join('|'))).includes(date));
    check('header switches to "My account"', (await page.$('[data-account-link="signed-in"]')) !== null);
    await page.screenshot({ path: `${out}/21-account-signed-in-form.png` });

    await (await page.$('form[data-variant] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('Appointment requested'), { timeout: 10000 });
    const ok = await text(page);
    check('booked with the account: success with doctor/date/time/status from the API', /Dr\. /.test(ok) && ok.includes('CONFIRMED') && /(AM|PM)/.test(ok));
    check('no OTP step for signed-in patients', !ok.includes('Verify your phone number'));
    check('success links to My appointments', ok.includes('View my appointments') && ok.includes('saved in My appointments'));
    const log = await mockLog();
    check('slot lock → POST /appointments, straight from the browser; no OTP, no guest-book', log.log.some((l) => /^POST \/api\/v1\/clinics\/[^ ]+\/slots\/lock$/.test(l)) && log.log.some((l) => l === 'POST /api/v1/appointments') && !log.log.some((l) => l.includes('/otp/') || l.includes('guest-book')));
    const mine = log.appointments.filter((a) => a.ownerEmail === email);
    check('appointment stored for this patient at the chosen time', mine.length === 1 && mine[0].appointmentDate === date && mine[0].startTime.startsWith(time.split('|')[0]), JSON.stringify(mine[0] ?? {}));
    await page.screenshot({ path: `${out}/22-account-booked.png` });

    // 2. My appointments + cancel
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.textContent.includes('View my appointments')).click())]);
    await page.waitForSelector('[data-appointments="upcoming"] li', { timeout: 10000 });
    const acct = await text(page);
    check('/account: greeting + upcoming appointment (Confirmed)', acct.includes('Hello, Lakshmi Prasanna') && (await page.$$('[data-appointments="upcoming"] li[data-status="CONFIRMED"]')).length === 1);
    check('/account: other clinics\' appointments hidden', !acct.includes('Dr. Elsewhere'));
    check('/account: no booking popup auto-open', (await wait(9500), !(await dialog(page))));
    await page.screenshot({ path: `${out}/23-my-appointments.png`, fullPage: true });
    await page.evaluate(() => [...document.querySelectorAll('[data-appointments="upcoming"] button')].find((b) => b.textContent.includes('Cancel appointment')).click());
    await page.waitForFunction(() => document.body.innerText.includes('Cancel this appointment?'));
    await page.type('[data-appointments="upcoming"] input[type=text]', 'Travelling that day');
    await page.screenshot({ path: `${out}/24-cancel-confirm.png` });
    await page.evaluate(() => [...document.querySelectorAll('[data-appointments="upcoming"] button')].find((b) => b.textContent.includes('Yes, cancel it')).click());
    await page.waitForFunction(() => document.body.innerText.includes('Your appointment has been cancelled.'), { timeout: 8000 });
    check('cancel → moved to Past & cancelled', (await page.$$('[data-appointments="past"] li[data-status="CANCELLED"]')).length === 1 && (await page.$$('[data-appointments="upcoming"] li')).length === 0);
    check('cancel sent the reason to the API', (await mockLog()).appointments.find((a) => a.ownerEmail === email)?.cancellationReason === 'Travelling that day');
    await page.screenshot({ path: `${out}/25-cancelled.png`, fullPage: true });

    // 3. Sign out, wrong password, sign back in
    await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Sign out').click());
    await page.waitForSelector('[data-auth-view="signin"]');
    check('sign out → sign-in form, token removed, header says Sign in', (await page.evaluate(() => sessionStorage.getItem('smsdc.patientSession'))) === null && (await page.$('[data-account-link="signed-out"]')) !== null);
    await typeAuth(page, 'input[type=email]', email);
    await typeAuth(page, 'input[autocomplete="current-password"]', 'WrongPass9');
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes("don't match"), { timeout: 5000 });
    check('wrong password → clear message, still signed out', (await page.evaluate(() => sessionStorage.getItem('smsdc.patientSession'))) === null);
    await typeAuth(page, 'input[autocomplete="current-password"]', password);
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForSelector('[data-appointments="past"] li', { timeout: 8000 });
    check('sign in again → appointments load', (await text(page)).includes('Hello, Lakshmi Prasanna'));
    check('token never in the URL or console', !page.url().includes('acc-') && !logs.some((l) => l.includes('acc-') || l.includes('ref-')));
    check('no console errors', noErrors(logs), logs.filter((l) => l.startsWith('error')).join(' | '));
    await ctx.close();
  }

  // 4. Staff account refused, duplicate email, forgot password (on /account)
  {
    const { ctx, page, logs } = await fresh(1280);
    await page.goto(`${base}/account`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-auth-view="signin"]', { timeout: 10000 });
    await typeAuth(page, 'input[type=email]', 'doctor.qa@mock.test');
    await typeAuth(page, 'input[autocomplete="current-password"]', 'DoctorPass1');
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('clinic staff account'), { timeout: 5000 });
    check('staff (doctor) account refused on the patient site', (await page.evaluate(() => sessionStorage.getItem('smsdc.patientSession'))) === null);
    await page.evaluate(() => [...document.querySelectorAll('[data-auth-view] button')].find((b) => b.textContent.trim() === 'Create account').click());
    await page.waitForSelector('[data-auth-view="signup"]');
    await typeAuth(page, 'input[autocomplete="name"]', 'Someone Else');
    await typeAuth(page, 'input[type=tel]', '9876543210');
    await typeAuth(page, 'input[type=email]', email);
    await typeAuth(page, 'input[autocomplete="new-password"]', 'Another123');
    await (await page.$('[data-auth-view] input[type=checkbox]')).click();
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('An account with this email already exists'), { timeout: 5000 });
    check('duplicate email → "already exists, sign in instead"', true);
    await page.evaluate(() => [...document.querySelectorAll('[data-auth-view] button')].find((b) => b.textContent.trim() === 'Sign in').click());
    await page.waitForSelector('[data-auth-view="signin"]');
    await page.evaluate(() => [...document.querySelectorAll('[data-auth-view] button')].find((b) => b.textContent.includes('Forgot password')).click());
    await page.waitForSelector('[data-auth-view="forgot"]');
    await typeAuth(page, 'input[type=email]', email);
    await (await page.$('[data-auth-view] button[type=submit]')).click();
    await page.waitForFunction(() => document.body.innerText.includes('a reset link is on its way'), { timeout: 5000 });
    check('forgot password → reset link message', (await mockLog()).log.some((l) => l === 'POST /api/v1/auth/forgot-password'));
    await page.screenshot({ path: `${out}/26-forgot.png` });
    check('/account is noindex', (await page.$eval('meta[name="robots"]', (m) => m.content).catch(() => '')).includes('noindex'));
    check('no console errors', noErrors(logs), logs.filter((l) => l.startsWith('error')).join(' | '));
    await ctx.close();
  }

  // 5. Mobile + Telugu
  for (const w of [360, 390]) {
    const { ctx, page } = await fresh(w, 800);
    await page.goto(`${base}/account`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-auth-view="signin"]', { timeout: 10000 });
    check(`/account @${w}: no horizontal overflow`, await noOverflow(page));
    await page.screenshot({ path: `${out}/27-account-${w}.png`, fullPage: true });
    await page.goto(`${base}/book`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('How would you like to book?'), { timeout: 15000 });
    await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Sign in / Create account')).click());
    await page.waitForSelector('[data-auth-view="signup"]');
    check(`/book account mode @${w}: no horizontal overflow`, await noOverflow(page));
    await page.screenshot({ path: `${out}/28-book-account-${w}.png`, fullPage: true });
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh(1280);
    await page.goto(`${base}/te/account`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-auth-view="signin"]', { timeout: 10000 });
    check('/te/account renders Telugu', (await text(page)).includes('మీ ఖాతాలోకి సైన్ ఇన్ చేయండి'));
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed (${suite})`);
fs.writeFileSync(`${out}/results-${suite}.json`, JSON.stringify(results, null, 2));
process.exitCode = failed.length ? 1 : 0;
