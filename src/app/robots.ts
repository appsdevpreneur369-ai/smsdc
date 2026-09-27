import type { MetadataRoute } from 'next';
import { noIndex } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo';

// Staging (NEXT_PUBLIC_SITE_ENV=staging) and previews (NEXT_PUBLIC_NOINDEX=true) must not be indexed.
export default function robots(): MetadataRoute.Robots {
  if (noIndex) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
