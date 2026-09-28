// TEST-ONLY: Lighthouse (mobile + desktop) on one URL per route type; HTML + JSON reports and a summary table.
// Usage: node scripts/harness/lighthouse-all.mjs http://localhost:3100 docs/seo-reports/<date> [mobile|desktop|both] [path ...]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://localhost:3100', out = 'docs/seo-reports/latest', which = 'both', ...only] = process.argv.slice(2);
const ROUTES = only.length
  ? only
  : ['/', '/about', '/services', '/services/gum-care', '/doctors', '/doctors/dr-suhasini', '/gallery', '/patient-education', '/patient-education/healthy-gums-healthy-heart', '/faqs', '/book', '/contact', '/emergency', '/privacy', '/te', '/this-page-does-not-exist'];
const forms = which === 'both' ? ['mobile', 'desktop'] : [which];
fs.mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const rows = [];

for (const form of forms) {
  for (const r of ROUTES) {
    const name = `${form}-${r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '_')}`;
    const file = path.join(out, name);
    const args = [
      'lighthouse@12', `${base}${r}`, '--quiet', '--output=html', '--output=json', `--output-path=${file}`,
      '--only-categories=performance,accessibility,best-practices,seo', `--chrome-path=${chrome}`, '--chrome-flags=--headless=new --no-sandbox',
      ...(form === 'desktop' ? ['--preset=desktop'] : []),
    ];
    try {
      execFileSync('npx', ['-y', ...args], { stdio: 'pipe', shell: true, timeout: 180000 });
      const j = JSON.parse(fs.readFileSync(`${file}.report.json`, 'utf8'));
      const s = (k) => Math.round((j.categories[k]?.score ?? 0) * 100);
      const fails = (k) =>
        j.categories[k].auditRefs
          .map((a) => j.audits[a.id])
          .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable')
          .map((a) => a.id);
      const row = {
        form, route: r, perf: s('performance'), a11y: s('accessibility'), bp: s('best-practices'), seo: s('seo'),
        lcp: j.audits['largest-contentful-paint']?.displayValue, cls: j.audits['cumulative-layout-shift']?.displayValue, tbt: j.audits['total-blocking-time']?.displayValue,
        seoFails: fails('seo'), a11yFails: fails('accessibility'), bpFails: fails('best-practices'),
      };
      rows.push(row);
      fs.rmSync(`${file}.report.json`); // keep the HTML report; the numbers go into summary.json
      console.log(`${form.padEnd(7)} ${r.padEnd(48)} P${row.perf} A${row.a11y} BP${row.bp} SEO${row.seo}  LCP ${row.lcp} CLS ${row.cls} TBT ${row.tbt}  ${[...row.seoFails, ...row.a11yFails, ...row.bpFails].join(' ')}`);
    } catch (e) {
      console.log(`${form} ${r} FAILED ${String(e.message).slice(0, 200)}`);
    }
  }
}
const prev = fs.existsSync(path.join(out, 'summary.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8')) : [];
const merged = [...prev.filter((p) => !rows.some((r) => r.form === p.form && r.route === p.route)), ...rows];
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(merged, null, 2));
