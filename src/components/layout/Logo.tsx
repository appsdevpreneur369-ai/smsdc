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

/**
 * The clinic's logo mark (from images.json) + the application title as text in the logo font (brand.json
 * fonts.logo), coloured from the logo: outline teal for the name, root teal for the subtitle.
 * On dark backgrounds: white name, gold subtitle. Client-safe: takes plain props.
 */
export function Logo({ data, inverted, className }: { data: LogoData; inverted?: boolean; className?: string }) {
  return (
    <Link href={data.href} aria-label={data.label} className={cn('group flex min-h-[44px] items-center gap-2.5 sm:gap-3', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small, already-optimised PNG */}
      <img src={inverted ? data.iconWhiteSrc : data.iconSrc} alt="" width={52} height={52} className="h-11 w-11 shrink-0 sm:h-[52px] sm:w-[52px]" />
      <span className="flex flex-col font-logo leading-tight">
        <span className={cn('text-[1.3rem] font-bold tracking-[0.01em] sm:text-[1.5rem]', inverted ? 'text-white' : 'text-primary-dark')}>
          {data.primary}
        </span>
        <span className={cn('whitespace-nowrap text-[0.72rem] font-medium tracking-[0.02em] sm:text-[0.82rem]', inverted ? 'text-accent' : 'text-primary')}>
          {data.secondary}
        </span>
      </span>
    </Link>
  );
}
