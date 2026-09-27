/** @type {import('next').NextConfig} */
const isStaging = process.env.NEXT_PUBLIC_SITE_ENV === 'staging';

const nextConfig = {
  // Self-contained server for the Docker image (same as clinicflow-frontend).
  output: 'standalone',
  poweredByHeader: false,
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
