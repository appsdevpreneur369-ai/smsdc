import Link from 'next/link';
import { cn } from '@/lib/cn';

export type LogoData = {
  href: string;
  iconSrc: string;
  iconWhiteSrc: string;
  primary: string;
  secondary: string;
  label: string;
};

/** Icon (SVG from images.json) + HTML wordmark in the brand fonts. Client-safe: takes plain props. */
export function Logo({ data, inverted, className }: { data: LogoData; inverted?: boolean; className?: string }) {
  return (
    <Link href={data.href} aria-label={data.label} className={cn('group flex min-h-[44px] items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny SVG, no optimisation needed */}
      <img src={inverted ? data.iconWhiteSrc : data.iconSrc} alt="" width={44} height={44} className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
      <span className="flex flex-col leading-none">
        <span className={cn('font-heading text-xl font-semibold tracking-tight sm:text-[1.4rem]', inverted ? 'text-white' : 'text-primary')}>
          {data.primary}
        </span>
        <span
          className={cn(
            'mt-1 whitespace-nowrap font-heading text-[0.5rem] font-medium uppercase tracking-[0.14em] sm:text-[0.6rem]',
            inverted ? 'text-on-dark-muted' : 'text-ink-muted',
          )}
        >
          {data.secondary}
        </span>
      </span>
    </Link>
  );
}
