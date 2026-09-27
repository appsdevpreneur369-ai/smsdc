// WCAG contrast check for the brand palette pairs the site uses. Run: npm run contrast
import fs from 'node:fs';
const { colors: c } = JSON.parse(fs.readFileSync(new URL('../content/brand.json', import.meta.url), 'utf8'));

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum, where it's used]
const pairs = [
  ['text', 'background', 4.5, 'body text'],
  ['textSecondary', 'background', 4.5, 'muted text on page'],
  ['textSecondary', 'surface', 4.5, 'muted text on cards'],
  ['primary', 'background', 4.5, 'teal links/eyebrows on page'],
  ['primary', 'surface', 4.5, 'teal links on cards'],
  ['primary', 'secondarySoft', 3.0, 'teal ICONS on soft aqua (non-text; text there uses primaryDark)'],
  ['primaryDark', 'secondarySoft', 4.5, 'chips'],
  ['onDark', 'primary', 4.5, 'white on teal buttons'],
  ['onDark', 'primaryHover', 4.5, 'white on teal hover'],
  ['onDark', 'primaryDark', 4.5, 'top bar'],
  ['onDark', 'dark', 4.5, 'footer headings'],
  ['onDarkMuted', 'dark', 4.5, 'footer text'],
  ['accent', 'dark', 4.5, 'gold text on dark'],
  ['dark', 'accent', 4.5, 'dark text on gold buttons'],
  ['accentText', 'background', 4.5, 'gold-dark text on page'],
  ['accentText', 'surface', 4.5, 'gold-dark text on cards'],
  ['onDark', 'whatsapp', 4.5, 'WhatsApp button'],
  ['success', 'surface', 4.5, 'open-now text'],
  ['danger', 'surface', 4.5, 'closed-now text'],
  ['accent', 'background', 3.0, 'INFO: gold on ivory (decorative only)'],
  ['secondary', 'background', 3.0, 'INFO: aqua on ivory (decorative only)'],
];
let fail = 0;
for (const [fg, bg, min, where] of pairs) {
  const r = ratio(c[fg], c[bg]);
  const info = where.startsWith('INFO');
  const ok = r >= min;
  if (!ok && !info) fail++;
  console.log(`${ok ? 'PASS' : info ? 'info' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  ${fg} on ${bg}  (${where})`);
}
process.exitCode = fail ? 1 : 0;
