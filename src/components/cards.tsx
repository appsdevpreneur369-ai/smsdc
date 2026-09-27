import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Category, Doctor } from '@/lib/content/schemas';
import { getDict, localePath, t, tx, type Lang } from '@/lib/i18n';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ContentImage, DraftBadge } from '@/components/ui/primitives';

/** Large image card with a dark gradient overlay, icon tile and title bottom-left; zooms on hover. */
export function ServiceCard({ category, lang, headingLevel = 'h3' }: { category: Category; lang: Lang; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel;
  const dict = getDict(lang);
  return (
    <Link
      href={localePath(lang, `/services/${category.slug}`)}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-brand bg-dark shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <ContentImage
        id={category.image}
        lang={lang}
        fill
        decorative
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" aria-hidden />
      <div className="relative p-5 sm:p-6">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-dark shadow-soft transition-transform duration-300 group-hover:-rotate-6">
          <Icon name={category.icon} className="h-6 w-6" />
        </span>
        <H className="flex items-center gap-2 text-xl font-semibold text-white">
          {tx(category.title, lang)}
          <DraftBadge status={category.status} lang={lang} />
        </H>
        <p className="mt-1.5 line-clamp-2 text-sm text-on-dark-muted">{tx(category.summary, lang)}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          {t(dict, 'services.count', { n: category.subTreatments.length })}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function DoctorCard({ doctor, lang, compact }: { doctor: Doctor; lang: Lang; compact?: boolean }) {
  const dict = getDict(lang);
  return (
    <Link
      href={localePath(lang, `/doctors/${doctor.slug}`)}
      className="group flex h-full flex-col overflow-hidden rounded-brand border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative">
        <Avatar doctor={doctor} className="aspect-[5/4] w-full" size={compact ? 'md' : 'lg'} />
        {doctor.role === 'head' && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-dark">{t(dict, 'doctors.headBadge')}</span>
        )}
        {!doctor.avatar.image && (
          <span className="absolute bottom-3 right-3 rounded-full bg-dark/40 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur">
            {t(dict, 'doctors.avatarNote')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          {doctor.displayName}
          <DraftBadge status={doctor.status} lang={lang} />
        </h3>
        <p className="mt-0.5 text-sm font-semibold text-primary">{doctor.qualification}</p>
        <p className="mt-2 text-sm text-ink-muted">{tx(doctor.speciality, lang)}</p>
        {!compact && <p className="mt-3 line-clamp-3 text-sm text-ink-muted">{tx(doctor.summary, lang)}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
          {t(dict, 'cta.viewProfile')}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
