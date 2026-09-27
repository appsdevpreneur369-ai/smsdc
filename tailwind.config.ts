import type { Config } from 'tailwindcss';

// Every colour is a CSS variable set from content/brand.json (see src/lib/theme.ts).
// Change the palette there, not here.
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' }, screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        primary: { DEFAULT: c('primary'), hover: c('primaryHover'), dark: c('primaryDark') },
        secondary: { DEFAULT: c('secondary'), soft: c('secondarySoft') },
        accent: { DEFAULT: c('accent'), text: c('accentText') },
        bg: c('background'),
        surface: c('surface'),
        ink: { DEFAULT: c('text'), muted: c('textSecondary') },
        line: c('border'),
        dark: { DEFAULT: c('dark'), soft: c('darkSoft') },
        'on-dark': { DEFAULT: c('onDark'), muted: c('onDarkMuted') },
        success: c('success'),
        danger: c('danger'),
        whatsapp: { DEFAULT: c('whatsapp'), hover: c('whatsappHover') },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        logo: ['var(--font-logo)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { brand: 'var(--radius)' },
      boxShadow: {
        soft: '0 10px 30px -12px rgb(var(--c-dark) / 0.18)',
        lift: '0 24px 48px -20px rgb(var(--c-dark) / 0.35)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: { float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
export default config;
