import type { CSSProperties, ReactNode } from 'react';

/**
 * Scroll-reveal wrapper. Server-rendered visible; `RevealObserver` (client) adds the animation only when
 * JS is running and the page is visible, and CSS disables it for prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) {
  const style = delay ? ({ '--reveal-delay': `${delay}s` } as CSSProperties) : undefined;
  return (
    <As data-reveal="" className={className} style={style}>
      {children}
    </As>
  );
}
