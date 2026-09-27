import { CheckCircle2 } from 'lucide-react';
import { home } from '@/lib/content';
import { tx, type Lang } from '@/lib/i18n';
import { siteVars } from '@/lib/vars';
import { ButtonLink, ContentImage, DraftBadge } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';

export function Hero({ lang }: { lang: Lang }) {
  const h = home.hero;
  const vars = siteVars(lang);
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-secondary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" aria-hidden />
      <div className="container relative grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-6 lg:pb-24 lg:pt-16">
        <div>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-primary shadow-soft">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
              {tx(h.badge, lang, vars)}
              <DraftBadge status={home.status} lang={lang} />
            </p>
          </div>
          <div>
            <h1 id="hero-heading" className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.4rem]">
              <span className="block">{tx(h.headlineLine1, lang, vars)}</span>
              {/* Accent line: teal text (AA on ivory) with a gold swash — gold text itself fails contrast. */}
              <span className="relative inline-block pb-2 text-primary">
                {tx(h.headlineLine2, lang, vars)}
                <svg className="absolute -bottom-1 left-0 h-3 w-full text-accent" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 9C60 3 140 1 298 7" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>
          </div>
          <div>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">{tx(h.text, lang, vars)}</p>
          </div>
          <div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={h.primaryCta.href} lang={lang} size="lg">
                {tx(h.primaryCta.label, lang)}
              </ButtonLink>
              <ButtonLink href={h.secondaryCta.href} lang={lang} size="lg" variant="outline">
                {tx(h.secondaryCta.label, lang)}
              </ButtonLink>
            </div>
          </div>
          <div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {h.trustTicks.map((tick, i) => (
                <li key={i} className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-ink">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                  {tx(tick, lang, vars)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="animate-float">
            <ContentImage id={h.image} lang={lang} priority className="h-auto w-full" sizes="(min-width: 1024px) 520px, 90vw" />
          </div>
          {h.chips.map((chip, i) => (
            <div
              key={i}
              className={
                i % 2 === 0
                  ? 'absolute -left-1 top-[12%] max-w-[210px] sm:-left-6'
                  : 'absolute -right-1 bottom-[10%] max-w-[230px] sm:-right-4'
              }
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-surface/90 p-3 pr-4 shadow-lift backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Icon name={chip.icon} className="h-5 w-5" />
                </span>
                <span className="font-heading text-[0.8rem] font-semibold leading-snug text-ink sm:text-sm">{tx(chip.label, lang, vars)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
