import type { MetadataRoute } from 'next';
import { brand, clinic } from '@/lib/content';
import { tx } from '@/lib/i18n';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tx(clinic.displayName, 'en'),
    short_name: tx(clinic.shortName, 'en'),
    description: tx(clinic.description, 'en'),
    start_url: '/',
    display: 'standalone',
    background_color: brand.colors.background,
    theme_color: brand.colors.primary,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
