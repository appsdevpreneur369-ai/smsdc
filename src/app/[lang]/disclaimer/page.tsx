import type { Lang } from '@/lib/i18n';
import { LegalPage, legalMetadata } from '@/components/LegalPage';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return legalMetadata('disclaimer', params.lang);
}

export default function Page({ params: { lang } }: { params: { lang: Lang } }) {
  return <LegalPage slug="disclaimer" lang={lang} />;
}
