import type { ReactNode } from 'react';
import { clinic } from '@/lib/content';
import { getDict, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/cn';

type Network = keyof typeof clinic.socialLinks;

// Brand marks as small inline SVGs (lucide-react 1.x ships no brand icons; no extra icon library).
const icons: Record<Network, { label: string; svg: ReactNode }> = {
  instagram: {
    label: 'Instagram',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.8 3.1Z" />
      </svg>
    ),
  },
  twitter: {
    label: 'X (Twitter)',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.4h2L6.5 3.2H4.3l13.3 17.4Z" />
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M5 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.5V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.8-.8Z" />
      </svg>
    ),
  },
};

const order: Network[] = ['instagram', 'youtube', 'twitter', 'linkedin', 'facebook'];

/**
 * Footer social icons from clinic.json → socialLinks. An empty URL renders a non-interactive icon
 * (no href, not focusable, default cursor); a URL renders a real link that opens in a new tab.
 */
export function SocialLinks({ lang }: { lang: Lang }) {
  const dict = getDict(lang);
  const base = 'flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition';
  return (
    <div className="mt-6">
      <h2 className="font-heading text-sm font-semibold text-white">{t(dict, 'footer.follow')}</h2>
      <ul className="mt-3 flex flex-wrap gap-2.5">
        {order.map((key) => {
          const url = clinic.socialLinks[key];
          const { label, svg } = icons[key];
          return (
            <li key={key}>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} ${t(dict, 'footer.opensNewTab')}`}
                  className={cn(base, 'hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-dark focus-visible:outline-accent')}
                >
                  {svg}
                </a>
              ) : (
                <span role="img" aria-label={`${label} (${t(dict, 'footer.comingSoon')})`} title={label} className={cn(base, 'cursor-default')}>
                  {svg}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
