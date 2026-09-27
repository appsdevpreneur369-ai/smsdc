// Generates the illustrations (in brand.json colours) and the favicon set (from the clinic's logo).
// Run after changing brand colours:  npm run brand
// Output: public/images/*.svg, public/images/services/*.svg, public/icons/*, src/app/favicon.ico
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'content/brand.json'), 'utf8'));
const c = brand.colors;

const out = (rel, data) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};

// ── Geometry (512 × 512 box) ────────────────────────────────────────────────
const TOOTH =
  'M256 104C228 74 176 58 138 78C96 100 90 158 102 210C112 254 126 290 138 336C148 374 152 414 172 424C194 434 202 396 210 364C218 332 232 306 256 306C280 306 294 332 302 364C310 396 318 434 340 424C360 414 364 374 374 336C386 290 400 254 410 210C422 158 416 100 374 78C336 58 284 74 256 104Z';

const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>
${body}
</svg>
`;

// ── Shared illustration helpers ─────────────────────────────────────────────
const sparkle = (x, y, r, fill, opacity = 1) =>
  `<path transform="translate(${x} ${y})" d="M0 ${-r}C${r * 0.18} ${-r * 0.18} ${r * 0.18} ${-r * 0.18} ${r} 0C${r * 0.18} ${r * 0.18} ${r * 0.18} ${r * 0.18} 0 ${r}C${-r * 0.18} ${r * 0.18} ${-r * 0.18} ${r * 0.18} ${-r} 0C${-r * 0.18} ${-r * 0.18} ${-r * 0.18} ${-r * 0.18} 0 ${-r}Z" fill="${fill}" opacity="${opacity}"/>`;

const toothDefs = (id = 't') => `
  <radialGradient id="${id}Fill" cx="0.36" cy="0.3" r="0.85"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F4FBFA"/><stop offset="1" stop-color="${c.secondarySoft}"/></radialGradient>
  <linearGradient id="${id}Shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0.55" stop-color="${c.primary}" stop-opacity="0"/><stop offset="1" stop-color="${c.primary}" stop-opacity="0.16"/></linearGradient>
  <filter id="${id}Shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="${c.dark}" flood-opacity="0.28"/></filter>
  <filter id="${id}Blur"><feGaussianBlur stdDeviation="10"/></filter>`;

// A glossy "3D-style" tooth at a transform (tooth box is 512 wide, ~370 tall).
const glossyTooth = (transform, id = 't') => `
  <g transform="${transform}">
    <path d="${TOOTH}" fill="url(#${id}Fill)" filter="url(#${id}Shadow)"/>
    <path d="${TOOTH}" fill="url(#${id}Shade)"/>
    <path d="${TOOTH}" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="3"/>
    <ellipse cx="176" cy="130" rx="34" ry="52" transform="rotate(-28 176 130)" fill="#FFFFFF" opacity="0.95" filter="url(#${id}Blur)"/>
    <ellipse cx="300" cy="112" rx="26" ry="12" transform="rotate(12 300 112)" fill="#FFFFFF" opacity="0.8" filter="url(#${id}Blur)"/>
  </g>`;

// ── Hero illustration ───────────────────────────────────────────────────────
out('public/images/hero-smile.svg', svg(640, 640, `
  <defs>${toothDefs('h')}
    <radialGradient id="halo" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="${c.secondary}" stop-opacity="0.45"/><stop offset="1" stop-color="${c.secondary}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0.2"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <circle cx="320" cy="300" r="300" fill="url(#halo)"/>
  <circle cx="320" cy="300" r="236" fill="${c.secondarySoft}"/>
  <circle cx="320" cy="300" r="236" fill="none" stroke="${c.secondary}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"/>
  <ellipse cx="320" cy="300" rx="286" ry="96" transform="rotate(-18 320 300)" fill="none" stroke="url(#ring)" stroke-width="5"/>
  <ellipse cx="320" cy="548" rx="150" ry="16" fill="${c.dark}" opacity="0.18" filter="url(#soft)"/>
  ${glossyTooth('translate(64 54)', 'h')}
  <path d="M214 560Q320 612 426 560" fill="none" stroke="${c.accent}" stroke-width="16" stroke-linecap="round"/>
  <circle cx="569" cy="210" r="11" fill="${c.accent}"/>
  <circle cx="84" cy="408" r="8" fill="${c.primary}" opacity="0.8"/>
  <circle cx="120" cy="170" r="16" fill="#FFFFFF" stroke="${c.secondary}" stroke-width="3"/>
  <circle cx="530" cy="452" r="22" fill="#FFFFFF" stroke="${c.secondary}" stroke-width="3" opacity="0.9"/>
  ${sparkle(470, 150, 30, c.accent)}
  ${sparkle(170, 470, 18, c.secondary)}
  ${sparkle(520, 330, 14, c.primary, 0.7)}
  ${sparkle(110, 280, 12, c.accent, 0.9)}`));

// ── About illustration (dental chair in a bright room) ─────────────────────
out('public/images/about-clinic.svg', svg(720, 640, `
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.secondarySoft}"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
    <linearGradient id="win" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.secondary}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.primary}" stop-opacity="0.35"/></linearGradient>
    <linearGradient id="seat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.primary}"/><stop offset="1" stop-color="${c.primaryDark}"/></linearGradient>
  </defs>
  <rect width="720" height="640" fill="url(#wall)"/>
  <rect x="0" y="500" width="720" height="140" fill="${c.border}" opacity="0.7"/>
  <rect x="420" y="70" width="230" height="250" rx="22" fill="url(#win)"/>
  <path d="M535 70V320M420 195H650" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="600" cy="120" r="26" fill="${c.accent}" opacity="0.9"/>
  <g transform="translate(80 80)">
    <rect x="96" y="0" width="12" height="130" rx="6" fill="${c.textSecondary}" opacity="0.6"/>
    <path d="M102 130C140 130 170 150 190 176" stroke="${c.textSecondary}" stroke-opacity="0.6" stroke-width="10" fill="none" stroke-linecap="round"/>
    <ellipse cx="220" cy="200" rx="56" ry="30" fill="#FFFFFF" stroke="${c.border}" stroke-width="4"/>
    <circle cx="220" cy="200" r="16" fill="${c.accent}" opacity="0.9"/>
  </g>
  <g transform="translate(90 250)">
    <path d="M40 150C30 110 60 70 110 80L200 100C230 106 246 130 250 160L262 220H70C52 220 44 190 40 150Z" fill="url(#seat)"/>
    <path d="M250 160L420 150C450 148 470 170 466 196L462 220H262Z" fill="url(#seat)"/>
    <rect x="20" y="40" width="80" height="52" rx="26" fill="${c.primaryDark}" transform="rotate(-24 60 66)"/>
    <rect x="150" y="220" width="40" height="120" fill="${c.textSecondary}" opacity="0.7"/>
    <rect x="80" y="330" width="200" height="22" rx="11" fill="${c.textSecondary}" opacity="0.8"/>
    <rect x="410" y="120" width="120" height="16" rx="8" fill="${c.textSecondary}" opacity="0.5"/>
    <rect x="516" y="120" width="14" height="230" fill="${c.textSecondary}" opacity="0.5"/>
    <rect x="420" y="96" width="30" height="24" rx="6" fill="#FFFFFF" stroke="${c.border}" stroke-width="3"/>
    <rect x="460" y="96" width="30" height="24" rx="6" fill="${c.secondary}" opacity="0.8"/>
  </g>
  <g transform="translate(40 440)"><rect width="70" height="100" rx="10" fill="${c.secondary}" opacity="0.6"/><path d="M35 0C10 -40 20 -80 35 -100C50 -80 60 -40 35 0Z" fill="${c.primary}" opacity="0.75"/></g>
  ${sparkle(640, 420, 20, c.accent)}
  ${sparkle(380, 60, 14, c.secondary)}`));

// ── FAQ decorative panel ────────────────────────────────────────────────────
out('public/images/faq-panel.svg', svg(560, 640, `
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.primary}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
    ${toothDefs('f')}
  </defs>
  <rect width="560" height="640" rx="40" fill="url(#p)"/>
  <path d="M0 440C120 380 220 520 360 470C460 434 520 360 560 380V640H0Z" fill="${c.secondary}" opacity="0.28"/>
  <path d="M0 520C140 470 260 600 420 560C480 546 530 510 560 520V640H0Z" fill="${c.secondary}" opacity="0.18"/>
  <circle cx="460" cy="110" r="150" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="90" cy="200" r="80" fill="#FFFFFF" opacity="0.05"/>
  ${glossyTooth('translate(130 120) scale(0.58)', 'f')}
  <g font-family="Poppins, Arial, sans-serif" font-weight="700" fill="#FFFFFF">
    <circle cx="120" cy="140" r="36" fill="${c.accent}"/><text x="120" y="156" font-size="44" text-anchor="middle" fill="${c.dark}">?</text>
    <circle cx="450" cy="330" r="28" fill="#FFFFFF" opacity="0.18"/><text x="450" y="343" font-size="34" text-anchor="middle">?</text>
  </g>
  ${sparkle(420, 200, 20, c.accent)}
  ${sparkle(150, 390, 14, '#FFFFFF', 0.8)}`));

// ── Service category artworks (800 × 600) ───────────────────────────────────
const bgs = {
  a: [c.primary, c.dark],
  b: [c.primaryDark, c.dark],
  c: [c.darkSoft, c.primary],
};
const serviceArt = (bgKey, glyph) => {
  const [from, to] = bgs[bgKey];
  return svg(800, 600, `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    ${toothDefs('s')}
    <filter id="glow"><feGaussianBlur stdDeviation="30"/></filter>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="560" cy="220" r="210" fill="${c.secondary}" opacity="0.22" filter="url(#glow)"/>
  <circle cx="660" cy="80" r="140" fill="#FFFFFF" opacity="0.05"/>
  <circle cx="90" cy="520" r="180" fill="#FFFFFF" opacity="0.04"/>
  <g fill="#FFFFFF" opacity="0.18">${Array.from({ length: 30 }, (_, i) => `<circle cx="${60 + (i % 6) * 26}" cy="${60 + Math.floor(i / 6) * 26}" r="3"/>`).join('')}</g>
  ${glyph}`);
};

const G = c.accent;
const W = '#FFFFFF';
const services = {
  general: serviceArt('a', `
    ${glossyTooth('translate(390 90) scale(0.62)', 's')}
    <g transform="translate(300 330) rotate(-35)"><rect x="-8" y="0" width="16" height="230" rx="8" fill="${W}" opacity="0.9"/><circle cx="0" cy="-34" r="44" fill="${c.secondarySoft}" stroke="${W}" stroke-width="10"/><circle cx="-12" cy="-46" r="12" fill="${W}" opacity="0.9"/></g>
    ${sparkle(700, 140, 26, G)}${sparkle(380, 90, 16, W, 0.8)}`),
  'root-canal': serviceArt('b', `
    ${glossyTooth('translate(380 70) scale(0.7)', 's')}
    <g transform="translate(380 70) scale(0.7)" fill="none" stroke="${G}" stroke-width="12" stroke-linecap="round">
      <path d="M220 200C210 260 196 320 186 400"/><path d="M292 200C302 260 316 320 326 400"/>
      <ellipse cx="256" cy="190" rx="60" ry="30" fill="${G}" fill-opacity="0.25"/>
    </g>
    ${sparkle(330, 150, 20, G)}${sparkle(720, 330, 16, W, 0.8)}`),
  implants: serviceArt('a', `
    <g transform="translate(470 70)">
      <path d="M-120 40C-120 -10 -60 -20 0 10C60 -20 120 -10 120 40C120 110 80 150 0 150C-80 150 -120 110 -120 40Z" fill="url(#sFill)" filter="url(#sShadow)"/>
      <rect x="-54" y="150" width="108" height="30" rx="8" fill="${c.secondarySoft}"/>
      <path d="M-46 186H46L34 400Q0 440 -34 400Z" fill="${W}" opacity="0.92"/>
      <g stroke="${c.primary}" stroke-width="10" stroke-linecap="round" opacity="0.8">${[220, 256, 292, 328, 364].map((y) => `<path d="M-44 ${y}L44 ${y + 14}"/>`).join('')}</g>
    </g>
    ${sparkle(640, 120, 24, G)}${sparkle(330, 260, 16, G, 0.9)}`),
  orthodontics: serviceArt('c', `
    <g transform="translate(250 150)">
      ${[0, 1, 2].map((i) => `<g transform="translate(${i * 150} ${i === 1 ? -10 : 10}) scale(0.34)"><path d="${TOOTH}" fill="url(#sFill)" filter="url(#sShadow)"/></g>`).join('')}
      <path d="M40 90Q250 60 460 110" fill="none" stroke="${G}" stroke-width="10" stroke-linecap="round"/>
      ${[0, 1, 2].map((i) => `<rect x="${i * 150 + 64}" y="${i === 1 ? 62 : 82}" width="44" height="40" rx="8" fill="#D8E4E3" stroke="${W}" stroke-width="4"/>`).join('')}
    </g>
    ${sparkle(700, 110, 24, G)}${sparkle(260, 110, 14, W, 0.8)}`),
  'oral-surgery': serviceArt('b', `
    <path d="M300 430C380 370 560 350 800 390V600H300Z" fill="#E48F8F" opacity="0.8"/><path d="M300 430C380 370 560 350 800 390" fill="none" stroke="#F6C1C1" stroke-width="8"/>
    ${glossyTooth('translate(620 170) rotate(28) scale(0.55)', 's')}
    ${glossyTooth('translate(400 200) scale(0.5)', 's')}
    <path d="M560 150L610 100M600 170L660 150" stroke="${G}" stroke-width="10" stroke-linecap="round"/>
    ${sparkle(360, 130, 20, G)}${sparkle(740, 110, 14, W, 0.8)}`),
  hygiene: serviceArt('a', `
    ${glossyTooth('translate(460 120) scale(0.55)', 's')}
    <g transform="translate(330 470) rotate(-50)">
      <rect x="0" y="-12" width="300" height="24" rx="12" fill="${W}"/>
      <rect x="300" y="-16" width="110" height="32" rx="12" fill="${c.secondary}"/>
      <g fill="${W}">${Array.from({ length: 7 }, (_, i) => `<rect x="${306 + i * 15}" y="-60" width="8" height="46" rx="4"/>`).join('')}</g>
    </g>
    ${sparkle(700, 120, 26, G)}${sparkle(440, 110, 18, W)}${sparkle(740, 330, 14, G, 0.9)}`),
  dentures: serviceArt('c', `
    <g transform="translate(470 290)">
      <path d="M-230 -40C-230 150 230 150 230 -40L190 -60C190 90 -190 90 -190 -60Z" fill="#E99A9A" opacity="0.85"/>
      ${Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI * (0.08 + (i / 7) * 0.84);
        const x = -Math.cos(a) * 200;
        const y = Math.sin(a) * 100 - 42;
        return `<rect x="${x - 22}" y="${y - 34}" width="44" height="56" rx="18" fill="url(#sFill)" stroke="${W}" stroke-width="3"/>`;
      }).join('')}
    </g>
    ${sparkle(700, 110, 24, G)}${sparkle(300, 120, 14, W, 0.8)}`),
  cosmetic: serviceArt('a', `
    ${glossyTooth('translate(400 80) scale(0.68)', 's')}
    <path d="M430 470Q575 540 720 470" fill="none" stroke="${G}" stroke-width="14" stroke-linecap="round"/>
    ${sparkle(720, 120, 34, G)}${sparkle(390, 120, 22, W)}${sparkle(700, 330, 16, W, 0.9)}${sparkle(420, 380, 14, G)}`),
  'gum-care': serviceArt('b', `
    <g transform="translate(330 120)">
      <g transform="scale(0.45)"><path d="${TOOTH}" fill="url(#sFill)" filter="url(#sShadow)"/></g>
      <g transform="translate(200 0) scale(0.45)"><path d="${TOOTH}" fill="url(#sFill)" filter="url(#sShadow)"/></g>
      <path d="M-20 150C40 110 90 170 140 130C190 90 250 160 300 120C350 90 400 130 440 120V260H-20Z" fill="#E78C8C" opacity="0.9"/>
      <path d="M-20 150C40 110 90 170 140 130C190 90 250 160 300 120C350 90 400 130 440 120" fill="none" stroke="#F6C1C1" stroke-width="8"/>
    </g>
    <path d="M660 110c-14-22-52-16-52 12 0 26 52 52 52 52s52-26 52-52c0-28-38-34-52-12z" fill="${G}"/>
    ${sparkle(340, 110, 18, W, 0.8)}`),
};
for (const [name, body] of Object.entries(services)) out(`public/images/services/${name}.svg`, body);

// ── Favicons / PWA icons from the clinic's logo (content/images.json → brand.logo.appIcon) ─────────────
const images = JSON.parse(fs.readFileSync(path.join(root, 'content/images.json'), 'utf8')).images;
const logoSrc = path.join(root, 'public', images[brand.logo.appIcon].src);
// Logo on a white tile (rounded for browser tabs, square for iOS/maskable which apply their own mask).
async function tile(size, { radius = 0.22, pad = 0.1 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(logoSrc).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const r = Math.round(size * radius);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#FFFFFF"/></svg>`);
  return sharp(bg).composite([{ input: logo, gravity: 'center' }]).png().toBuffer();
}
for (const [file, size] of Object.entries({ 'icon-16.png': 16, 'icon-32.png': 32, 'icon-192.png': 192, 'icon-512.png': 512 }))
  out(`public/icons/${file}`, await tile(size, { pad: size <= 32 ? 0.02 : 0.1 }));
out('public/icons/apple-touch-icon.png', await tile(180, { radius: 0, pad: 0.12 }));
out('public/icons/icon-maskable-512.png', await tile(512, { radius: 0, pad: 0.2 }));

// favicon.ico containing 16/32/48 PNGs
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map((s) => tile(s, { pad: 0.02 })));
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach((img, i) => {
  const o = 6 + i * 16;
  header.writeUInt8(icoSizes[i], o);
  header.writeUInt8(icoSizes[i], o + 1);
  header.writeUInt16LE(1, o + 4);
  header.writeUInt16LE(32, o + 6);
  header.writeUInt32LE(img.length, o + 8);
  header.writeUInt32LE(offset, o + 12);
  offset += img.length;
});
out('src/app/favicon.ico', Buffer.concat([header, ...icoImages]));

console.log('Brand assets generated.');
