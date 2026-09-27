import { NextResponse, type NextRequest } from 'next/server';
import { clinicflowApiConfig } from '@/lib/booking/serverConfig';

// Same-origin, read-only proxy for ClinicFlow247's PUBLIC GET endpoints, so branches/doctors/slots load
// without depending on the API's CORS list. POSTs (OTP, guest-book, leads) are never proxied: guest booking
// is rate-limited per IP and must come from each visitor's own browser.
const UUID = '[0-9a-fA-F-]{36}';
const SLUG = '[a-z0-9-]{1,120}';
const ALLOWED: { re: RegExp; maxAge: number }[] = [
  { re: new RegExp(`^clinics/public/${SLUG}$`), maxAge: 300 },
  { re: new RegExp(`^clinics/public/${SLUG}/branches$`), maxAge: 300 },
  { re: new RegExp(`^clinics/${UUID}/doctors$`), maxAge: 300 },
  { re: new RegExp(`^clinics/${UUID}/doctors/${UUID}/slots$`), maxAge: 15 },
  { re: new RegExp(`^clinics/${UUID}/doctors/${UUID}/slots/next-available$`), maxAge: 30 },
];
const ALLOWED_PARAMS = new Set(['branchId', 'date']);
// ?fresh=1 skips the cache (used right before booking and after a slot turned out to be taken).

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const rule = ALLOWED.find((r) => r.re.test(path));
  if (!rule) return NextResponse.json({ success: false, error: { code: 'NOT_ALLOWED', message: 'Not proxied' } }, { status: 404 });

  const { baseUrl } = clinicflowApiConfig();
  if (!baseUrl) return NextResponse.json({ success: false, error: { code: 'NOT_CONFIGURED' } }, { status: 503 });

  const qs = new URLSearchParams();
  req.nextUrl.searchParams.forEach((v, k) => {
    if (ALLOWED_PARAMS.has(k) && /^[0-9a-zA-Z-]{1,64}$/.test(v)) qs.set(k, v);
  });
  const target = `${baseUrl}/${path}${qs.size ? `?${qs}` : ''}`;

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  try {
    const upstream = await fetch(target, {
      headers: { Accept: 'application/json' },
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: rule.maxAge } }),
      signal: AbortSignal.timeout(20_000), // the API scales to zero; allow for a cold start
    });
    const body = await upstream.text();
    return new NextResponse(body || null, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        'Cache-Control': upstream.ok && !fresh ? `public, max-age=${rule.maxAge}, s-maxage=${rule.maxAge}` : 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'UPSTREAM_UNREACHABLE' } }, { status: 502 });
  }
}
