/** @type {import('next').NextConfig} */
const isStaging = process.env.NEXT_PUBLIC_SITE_ENV === 'staging';

const nextConfig = {
  // Self-contained server for the Docker image (same as clinicflow-frontend).
  output: 'standalone',
  poweredByHeader: false,
  // Photos are served as AVIF (or WebP) at the size each layout needs; originals stay JPEG in /public.
  images: { formats: ['image/avif', 'image/webp'] },
  // Treatments live at /services (the nav label reads "Treatments"); keep /treatments working as an alias.
  async redirects() {
    return [
      { source: '/treatments', destination: '/services', permanent: true },
      { source: '/treatments/:slug', destination: '/services/:slug', permanent: true },
      { source: '/te/treatments', destination: '/te/services', permanent: true },
      { source: '/te/treatments/:slug', destination: '/te/services/:slug', permanent: true },
    ];
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ];
    // Staging must never be indexed (robots.txt also disallows everything there).
    const noindex = isStaging ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [];
    return [{ source: '/:path*', headers: [...security, ...noindex] }];
  },
};

export default nextConfig;
