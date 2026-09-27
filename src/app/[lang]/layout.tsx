import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { brand, clinic, noIndex, siteUrl } from '@/lib/content';
import { fontClassNames, themeCss } from '@/lib/theme';
import { getDict, isLang, locales, t, tx } from '@/lib/i18n';
import { clinicJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/seo/JsonLd';
import { FloatingActions, Footer, SiteHeader, TopBar } from '@/components/layout/chrome';
import { RevealObserver } from '@/components/ui/RevealObserver';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = isLang(params.lang) ? params.lang : 'en';
  const name = tx(clinic.displayName, lang);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: name, template: `%s | ${tx(clinic.shortName, lang)}` },
    description: tx(clinic.description, lang),
    applicationName: tx(clinic.shortName, lang),
    icons: {
      icon: [
        { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
    formatDetection: { telephone: false },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: brand.colors.primary,
  width: 'device-width',
  initialScale: 1,
};

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const dict = getDict(lang);
  return (
    <html lang={dict._meta.htmlLang} className={fontClassNames} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-primary px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t(dict, 'nav.skip')}
        </a>
        <TopBar lang={lang} />
        <SiteHeader lang={lang} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer lang={lang} />
        <FloatingActions lang={lang} />
        <RevealObserver />
        <JsonLd data={clinicJsonLd(lang)} />
      </body>
    </html>
  );
}
