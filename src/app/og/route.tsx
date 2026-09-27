import { ImageResponse } from 'next/og';
import { brand, clinic, getImage } from '@/lib/content';
import { tx } from '@/lib/i18n';

export const runtime = 'edge';

// The bundled OG font covers Latin only; Telugu titles fall back to the English tagline rather than render boxes.
const LATIN_ONLY = /^[ -ɏ‐-‧]+$/;

/** Open Graph card (1200×630) built from brand.json + clinic.json. /og?title=<page title> */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('title')?.slice(0, 90) ?? '';
  const title = LATIN_ONLY.test(raw) ? raw : tx(clinic.tagline, 'en');
  const c = brand.colors;
  const logoPath = getImage(brand.logo.iconWhite).src;
  const buf = new Uint8Array((await fetch(new URL(logoPath, req.url)).then((r) => r.arrayBuffer())) as ArrayBuffer);
  let bin = '';
  buf.forEach((b) => (bin += String.fromCharCode(b)));
  const iconSrc = `data:image/png;base64,${btoa(bin)}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: `linear-gradient(135deg, ${c.primary} 0%, ${c.dark} 100%)`,
          color: c.onDark,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} width={96} height={96} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 52, fontWeight: 700 }}>{brand.wordmark.primary}</div>
            <div style={{ fontSize: 26, color: c.accent }}>{brand.wordmark.secondary}</div>
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: c.onDarkMuted }}>
          <div style={{ width: 80, height: 6, borderRadius: 3, background: c.accent }} />
          {clinic.address.locality}, {clinic.address.region} · {clinic.phone.display}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
