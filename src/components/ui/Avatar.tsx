import Image from 'next/image';
import { getImage } from '@/lib/content';
import type { Doctor } from '@/lib/content/schemas';
import { cn } from '@/lib/cn';

const tones: Record<Doctor['avatar']['tone'], string> = {
  primary: 'from-primary to-primary-dark text-white',
  secondary: 'from-secondary to-primary text-white',
  accent: 'from-accent to-accent-text text-dark',
  dark: 'from-dark-soft to-dark text-accent',
};

/** Doctor photo from images.json, or a brand-coloured initials avatar until a real headshot arrives. */
export function Avatar({ doctor, className, size = 'md' }: { doctor: Doctor; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (doctor.avatar.image) {
    const img = getImage(doctor.avatar.image);
    return (
      <Image src={img.src} alt={doctor.displayName} width={img.width} height={img.height} className={cn('object-cover', className)} />
    );
  }
  return (
    <div
      role="img"
      aria-label={doctor.displayName}
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br font-heading font-semibold',
        tones[doctor.avatar.tone],
        size === 'sm' && 'text-lg',
        size === 'md' && 'text-4xl',
        size === 'lg' && 'text-6xl',
        className,
      )}
    >
      <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <span className="absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/10" aria-hidden />
      <span className="relative tracking-wide" aria-hidden>
        {doctor.initials}
      </span>
    </div>
  );
}
