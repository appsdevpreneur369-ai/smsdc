// Pure fallback selection: clinicflow → enquiry → whatsapp (unit-tested).

export type BookingMode = 'clinicflow' | 'enquiry' | 'whatsapp';
export type ModeHealth = { ok: boolean; reason?: string };
export type HealthReport = Partial<Record<Exclude<BookingMode, 'whatsapp'>, ModeHealth>>;

export function fallbackOrder(preferred: BookingMode): BookingMode[] {
  if (preferred === 'clinicflow') return ['clinicflow', 'enquiry', 'whatsapp'];
  if (preferred === 'enquiry') return ['enquiry', 'whatsapp'];
  return ['whatsapp'];
}

/** First healthy mode in the fallback order; WhatsApp needs no network and is always available. */
export function selectMode(preferred: BookingMode, health: HealthReport): { mode: BookingMode; reasons: string[] } {
  const reasons: string[] = [];
  for (const mode of fallbackOrder(preferred)) {
    if (mode === 'whatsapp') return { mode, reasons };
    const h = health[mode];
    if (h?.ok) return { mode, reasons };
    reasons.push(`${mode} unavailable: ${h?.reason ?? 'not checked'}`);
  }
  return { mode: 'whatsapp', reasons };
}
