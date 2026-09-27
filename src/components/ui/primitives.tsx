import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { getImage, showPlaceholderBadges } from '@/lib/content';
import type { Status } from '@/lib/content/schemas';
import { getDict, t, tx, type Lang } from '@/lib/i18n';
import { resolveHref } from '@/lib/links';
import { cn } from '@/lib/cn';
import { WhatsAppIcon } from './Icon';
import { buttonClass, type Variant } from './primitives-client';

export { buttonClass };

/** Small "Draft" pill on placeholder content. Hidden unless NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true. */
export function DraftBadge({ status, lang, className }: { status: Status | undefined; lang: Lang; className?: string }) {
  if (!showPlaceholderBadges || status !== 'placeholder') return null;
  const dict = getDict(lang);
  return (
    <span
      title={t(dict, 'common.draftTitle')}
      className={cn(
        'inline-flex select-none items-center gap-1 rounded-full border border-dashed border-accent-text/60 bg-accent/15 px-2 py-0.5 align-middle font-body text-[0.65rem] font-bold uppercase tracking-wider text-accent-text',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-text" aria-hidden />
      {t(dict, 'common.draft')}
    </span>
  );
}

/** Link-styled button. `href` may be a site path, '@call', '@whatsapp' or an absolute URL. */
export function ButtonLink({
  href,
  lang,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ariaLabel,
}: {
  href: string;
  lang: Lang;
  variant?: Variant;
  size?: 'md' | 'lg' | 'sm';
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const r = resolveHref(href, lang);
  const cls = cn(buttonClass(variant, size), className);
  if (r.external || r.href.startsWith('tel:') || r.href.startsWith('mailto:')) {
    return (
      <a href={r.href} className={cls} aria-label={ariaLabel} {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {href === '@whatsapp' && <WhatsAppIcon />}
        {children}
      </a>
    );
  }
  return (
    <Link href={r.href} className={cls} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  heading,
  intro,
  align = 'center',
  as: As = 'h2',
  id,
  className,
  badge,
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  align?: 'center' | 'left';
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
  badge?: ReactNode;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <As id={id} className={cn('font-bold tracking-tight', As === 'h1' ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-3xl sm:text-4xl')}>
        {heading} {badge}
      </As>
      {intro && <p className="mt-4 text-lg text-ink-muted">{intro}</p>}
    </div>
  );
}

/** next/image for an entry in content/images.json. */
export function ContentImage({
  id,
  lang,
  className,
  priority,
  sizes,
  fill,
  decorative,
}: {
  id: string;
  lang: Lang;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  decorative?: boolean;
}) {
  const img = getImage(id);
  const alt = decorative ? '' : tx(img.alt, lang);
  const unoptimized = img.src.endsWith('.svg');
  return fill ? (
    <Image src={img.src} alt={alt} fill className={className} priority={priority} sizes={sizes} unoptimized={unoptimized} />
  ) : (
    <Image src={img.src} alt={alt} width={img.width} height={img.height} className={className} priority={priority} sizes={sizes} unoptimized={unoptimized} />
  );
}
