// Treatment options and treatment → doctor mapping, built from content (pure; unit-tested).
// ClinicFlow books appointments with a DOCTOR, not a treatment: every option carries the doctor(s) who see it,
// taken from content (routing.json problems, services.json categories/sub-treatments, booking.json generalOption).

export type TreatmentOption = { id: string; label: string; doctors: string[] };
export type TreatmentGroup = { id: string; label: string; options: TreatmentOption[] };

type LocText = string;
export type TreatmentSource = {
  generalGroupLabel: LocText;
  generalOption: { label: LocText; doctors: string[] };
  problems: { id: string; label: LocText; doctors: string[] }[];
  categories: {
    slug: string;
    title: LocText;
    doctors: string[];
    subTreatments: { slug: string; title: LocText; doctors?: string[] }[];
  }[];
  allowDirectSpecialistBooking: boolean;
  defaultDoctor: string;
};

export function buildTreatmentGroups(src: TreatmentSource): TreatmentGroup[] {
  const route = (doctors: string[]) => (src.allowDirectSpecialistBooking ? doctors : [src.defaultDoctor]);
  const general: TreatmentGroup = {
    id: 'general',
    label: src.generalGroupLabel,
    options: [
      { id: 'general', label: src.generalOption.label, doctors: route(src.generalOption.doctors) },
      ...src.problems.map((p) => ({ id: `problem:${p.id}`, label: p.label, doctors: route(p.doctors) })),
    ],
  };
  const cats: TreatmentGroup[] = src.categories.map((c) => ({
    id: `category:${c.slug}`,
    label: c.title,
    options: c.subTreatments.map((s) => ({
      id: `treatment:${c.slug}/${s.slug}`,
      label: s.title,
      doctors: route(s.doctors ?? c.doctors),
    })),
  }));
  return [general, ...cats];
}

export const allOptions = (groups: TreatmentGroup[]) => groups.flatMap((g) => g.options);

export function findOption(groups: TreatmentGroup[], id: string | null | undefined): TreatmentOption | undefined {
  return id ? allOptions(groups).find((o) => o.id === id) : undefined;
}

/**
 * Doctors to fetch slots for. A preferred doctor (from a doctor page) narrows the list when that doctor
 * treats the option; otherwise every mapped doctor is used and their slots are merged.
 */
export function doctorsForOption(option: TreatmentOption | undefined, preferredDoctor?: string | null): string[] {
  if (!option) return [];
  if (preferredDoctor && option.doctors.includes(preferredDoctor)) return [preferredDoctor];
  return option.doctors;
}

/** Map deep-link params (?problem=, ?treatment=<category or category/sub>, ?doctor=) to an option id. */
export function resolvePrefill(
  groups: TreatmentGroup[],
  params: { problem?: string | null; treatment?: string | null; doctor?: string | null },
): { treatmentId: string | null; preferredDoctor: string | null } {
  const options = allOptions(groups);
  const preferredDoctor = params.doctor || null;
  if (params.problem && options.some((o) => o.id === `problem:${params.problem}`))
    return { treatmentId: `problem:${params.problem}`, preferredDoctor };
  if (params.treatment) {
    const exact = options.find((o) => o.id === `treatment:${params.treatment}`);
    if (exact) return { treatmentId: exact.id, preferredDoctor };
    const group = groups.find((g) => g.id === `category:${params.treatment}`);
    if (group) {
      // Prefer an option the preferred doctor treats, else the category's first option.
      const pick = (preferredDoctor && group.options.find((o) => o.doctors.includes(preferredDoctor))) || group.options[0];
      if (pick) return { treatmentId: pick.id, preferredDoctor };
    }
  }
  if (preferredDoctor) {
    // Doctor page: the first option this doctor treats (most specific to them first).
    const solo = options.find((o) => o.doctors.length === 1 && o.doctors[0] === preferredDoctor && o.id !== 'general');
    const any = options.find((o) => o.doctors.includes(preferredDoctor));
    return { treatmentId: (solo ?? any)?.id ?? null, preferredDoctor };
  }
  return { treatmentId: null, preferredDoctor: null };
}
