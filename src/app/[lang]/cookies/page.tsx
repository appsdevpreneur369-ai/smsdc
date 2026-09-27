import type { Lang } from '@/lib/i18n';
import { LegalPage, legalMetadata } from '@/components/LegalPage';

export function generateMetadata({ params }: { params: { lang: Lang } }) {
  return legalMetadata('cookies', params.lang);
}

export default function Page({ params: { lang } }: { params: { lang: Lang } }) {
  return <LegalPage slug="cookies" lang={lang} />;
}
