import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { Photo } from '@/lib/gallery';

const RATIO = 4 / 3;

/**
 * 4:3 thumbnail. Photos that aren't ~4:3 (e.g. a square poster) are shown whole on a blurred copy of
 * themselves instead of being cropped.
 */
export function PhotoThumb({ photo, sizes, className, priority }: { photo: Photo; sizes: string; className?: string; priority?: boolean }) {
  const fits = Math.abs(photo.width / photo.height - RATIO) < 0.05;
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden bg-secondary-soft', className)}>
      {fits ? (
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <>
          <Image src={photo.src} alt="" aria-hidden fill sizes="160px" className="scale-110 object-cover opacity-70 blur-xl" />
          <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-contain transition-transform duration-700 group-hover:scale-105" />
        </>
      )}
    </div>
  );
}
