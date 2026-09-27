import { Manrope, Poppins, Inter, Roboto, Noto_Sans_Telugu } from 'next/font/google';
import { brand } from './content';

// next/font must be declared statically. brand.json picks from this registry by name;
// to use a new font, add it here once (see docs/EDITING.md).
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-poppins', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto', display: 'swap' });
// Telugu glyphs: unicode-range limited, so English pages never download it.
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], weight: ['400', '600', '700'], variable: '--font-telugu', display: 'swap', preload: false });

const registry: Record<string, { variable: string; cssVar: string }> = {
  Poppins: { variable: poppins.variable, cssVar: '--font-poppins' },
  Manrope: { variable: manrope.variable, cssVar: '--font-manrope' },
  Inter: { variable: inter.variable, cssVar: '--font-inter' },
  Roboto: { variable: roboto.variable, cssVar: '--font-roboto' },
};

function font(name: string) {
  const f = registry[name];
  if (!f) throw new Error(`brand.json font "${name}" is not registered in src/lib/theme.ts`);
  return f;
}

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const heading = font(brand.fonts.heading);
const body = font(brand.fonts.body);
const logo = font(brand.fonts.logo);

export const fontClassNames = Array.from(new Set([heading.variable, body.variable, logo.variable, telugu.variable])).join(' ');

/** :root CSS variables generated from brand.json. Telugu glyphs fall through to Noto Sans Telugu. */
export const themeCss = `:root{${Object.entries(brand.colors)
  .map(([k, v]) => `--c-${k}:${hexToRgb(v)};`)
  .join('')}--radius:${brand.radius};--font-heading:var(${heading.cssVar}),var(--font-telugu),'Nirmala UI';--font-body:var(${body.cssVar}),var(--font-telugu),'Nirmala UI';--font-logo:var(${logo.cssVar}),var(--font-telugu),sans-serif;}`;
