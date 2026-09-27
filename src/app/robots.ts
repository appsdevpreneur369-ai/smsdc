import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

// Preview deployments should set NEXT_PUBLIC_NOINDEX=true so drafts aren't indexed before go-live.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_NOINDEX === 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
