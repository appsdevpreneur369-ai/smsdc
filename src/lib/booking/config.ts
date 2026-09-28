// Serialisable booking configuration handed from the server (content) to the client booking UI.
import type { BookingDoctor } from './BookingService';
import type { PopupConfig } from './popupRules';
import type { BookingMode } from './selectMode';
import type { TreatmentGroup } from './treatments';

export type BookingClientConfig = {
  lang: 'en' | 'te';
  preferredMode: BookingMode;
  api: { baseUrl: string; clinicSlug: string; clinicId: string };
  /** Same-origin GET proxy for ClinicFlow (see src/app/api/clinicflow). */
  proxyBase: string;
  advanceDays: number;
  /** Appointment length in minutes (doctors.json consultSlotMinutes): step of the offline preferred-time list. */
  slotMinutes: number;
  otpResendSeconds: number;
  timezone: string;
  treatments: TreatmentGroup[];
  doctors: BookingDoctor[];
  clinic: {
    name: string;
    shortName: string;
    branchName: string;
    address: string;
    mapsUrl: string;
    whatsappDigits: string;
    phoneDisplay: string;
    telHref: string;
  };
  popup: PopupConfig;
  consentText: string;
  privacyHref: string;
  whatsappTemplate: string;
  enquiryTemplate: string;
  note: string;
  strings: Record<string, string>;
  /** Patient-account UI strings (i18n "account"). */
  accountStrings: Record<string, string>;
  /** Localised path of the My account page. */
  accountHref: string;
  /** Staging/demo only (NEXT_PUBLIC_BOOKING_OTP_HINT): the fixed code shown next to the OTP field while SMS is in dry-run. */
  otpHint: string;
  dayNames: Record<string, string>;
};
