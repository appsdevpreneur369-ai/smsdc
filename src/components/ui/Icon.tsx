import {
  Activity,
  AlarmClock,
  ArrowRight,
  Award,
  Bandage,
  BookOpen,
  CalendarCheck,
  CircleHelp,
  ClipboardList,
  Clock,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShieldPlus,
  Siren,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  ToothbrushSparkles,
  Users,
  Zap,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

type IconProps = { className?: string; strokeWidth?: number };

// Dental glyphs lucide doesn't have. Drawn on a 24px grid in lucide's stroke style.
const toothPath =
  'M12 5.2c-1.2-1.4-3.5-2-5-1.1C5.2 5.1 5 7.6 5.6 9.9c.5 1.9 1 3.5 1.5 5.5.4 1.6.6 3.4 1.5 3.8 1 .5 1.3-1.2 1.7-2.6.3-1.4.9-2.5 1.7-2.5s1.4 1.1 1.7 2.5c.4 1.4.7 3.1 1.7 2.6.9-.4 1.1-2.2 1.5-3.8.5-2 1-3.6 1.5-5.5.6-2.3.4-4.8-1.4-5.8-1.5-.9-3.8-.3-5 1.1z';
function custom(children: (p: IconProps) => React.ReactNode) {
  const C = ({ className, strokeWidth = 1.8 }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children({ className, strokeWidth })}
    </svg>
  );
  return C;
}
const Tooth = custom(() => <path d={toothPath} />);
const ToothRoot = custom(() => (
  <>
    <path d={toothPath} />
    <path d="M10.3 9.5l-.6 5M13.7 9.5l.6 5" />
  </>
));
const Implant = custom(() => (
  <>
    <path d="M7 6.5C7 4 9.5 3.5 12 4.8 14.5 3.5 17 4 17 6.5c0 2.3-1.8 3.5-5 3.5S7 8.8 7 6.5z" />
    <path d="M9.5 12h5l-.8 8.2c-.3 1-2.1 1-2.4 0z" />
    <path d="M9.8 14.5l4.4.8M10 17l4 .8" />
  </>
));
const Braces = custom(() => (
  <>
    <rect x="3" y="7" width="5" height="10" rx="2" />
    <rect x="9.5" y="7" width="5" height="10" rx="2" />
    <rect x="16" y="7" width="5" height="10" rx="2" />
    <path d="M2 12h20" />
  </>
));
const Denture = custom(() => (
  <>
    <path d="M3 9c0 6 4 9 9 9s9-3 9-9" />
    <path d="M6.5 10.5v2M9.5 11.5v2.5M12 12v2.5M14.5 11.5v2.5M17.5 10.5v2" />
  </>
));
const Gum = custom(() => (
  <>
    <path d="M6 4.5c.9-.9 2.7-.6 3.3.6.6-1.2 2.4-1.5 3.3-.6 1 1 .8 2.9.4 4.2" />
    <path d="M13 4.5c.9-.9 2.7-.6 3.3.6.6-1.2 2.4-1.5 3.3-.6" />
    <path d="M3 12c2-1.6 3.6.6 5.4-.6 1.8-1.2 3.4.8 5.2-.4 1.8-1.2 3.6.6 5.4-.6.8-.5 1.4-.4 2 0v7H3z" />
  </>
));
const Surgery = custom(() => (
  <>
    <path d={toothPath} transform="translate(-2 1) scale(.9)" />
    <path d="M16 3l5 5M18.5 5.5L14 10" />
  </>
));

const registry: Record<string, ComponentType<IconProps> | ComponentType<LucideProps & SVGProps<SVGSVGElement>>> = {
  activity: Activity,
  'alarm-clock': AlarmClock,
  'arrow-right': ArrowRight,
  award: Award,
  bandage: Bandage,
  book: BookOpen,
  braces: Braces,
  calendar: CalendarCheck,
  'clipboard-list': ClipboardList,
  clock: Clock,
  denture: Denture,
  gum: Gum,
  'hand-coins': HandCoins,
  'heart-handshake': HeartHandshake,
  'heart-pulse': HeartPulse,
  help: CircleHelp,
  implant: Implant,
  languages: Languages,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  phone: Phone,
  'shield-check': ShieldCheck,
  'shield-plus': ShieldPlus,
  siren: Siren,
  smile: Smile,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  surgery: Surgery,
  syringe: Syringe,
  thermometer: Thermometer,
  tooth: Tooth,
  'tooth-root': ToothRoot,
  'toothbrush-sparkles': ToothbrushSparkles,
  users: Users,
  zap: Zap,
};

/** Renders an icon chosen by name in the content files. Unknown names fall back to a tooth. */
export function Icon({ name, className = 'h-6 w-6', strokeWidth }: { name: string; className?: string; strokeWidth?: number }) {
  const C = (registry[name] ?? Tooth) as ComponentType<IconProps & { 'aria-hidden'?: boolean }>;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden />;
}

/** WhatsApp glyph (brand mark, drawn simply). */
export function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
