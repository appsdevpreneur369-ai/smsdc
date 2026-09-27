// Client-safe UI helpers (no content imports).
import { cn } from '@/lib/cn';

export type Variant = 'primary' | 'outline' | 'gold' | 'white' | 'outline-white' | 'whatsapp' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-soft',
  outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
  gold: 'bg-accent text-dark hover:brightness-105 shadow-soft',
  white: 'bg-white text-primary-dark hover:bg-secondary-soft',
  'outline-white': 'border-2 border-white/70 text-white hover:bg-white hover:text-primary-dark',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-hover',
  ghost: 'text-primary hover:bg-secondary-soft',
};

export function buttonClass(variant: Variant = 'primary', size: 'md' | 'lg' | 'sm' = 'md') {
  return cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full font-heading font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0',
    size === 'lg' && 'px-7 py-3.5 text-base',
    size === 'md' && 'px-6 py-3 text-[0.95rem]',
    size === 'sm' && 'px-4 py-2 text-sm',
    variants[variant],
  );
}

