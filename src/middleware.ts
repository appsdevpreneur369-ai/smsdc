import { NextResponse, type NextRequest } from 'next/server';

// English is served at the root (/about); Telugu under /te (/te/about).
// Internally every page lives under app/[lang], so root paths are rewritten to /en/*.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }
  // x-lang lets not-found.tsx (which receives no params) render in the right language.
  const headers = new Headers(req.headers);
  if (pathname === '/te' || pathname.startsWith('/te/')) {
    headers.set('x-lang', 'te');
    return NextResponse.next({ request: { headers } });
  }

  headers.set('x-lang', 'en');
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Skip Next internals, API routes, generated metadata routes and any file with an extension.
  matcher: ['/((?!_next|api|og|sitemap.xml|robots.txt|manifest.webmanifest|favicon.ico|.*\\..*).*)'],
};
