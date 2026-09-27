// Booking service abstraction. Implementations: ClinicFlowBookingService (real API), EnquiryBookingService
// (real lead via POST /clinics/public/{slug}/leads), WhatsAppBookingService (no network, opens wa.me).
// There is deliberately no mock implementation here — mocks live only in tests/harnesses.
import type { Day } from '../content/schemas';
import type { BookingMode } from './selectMode';
import type { TreatmentGroup } from './treatments';

export type Branch = { id: string; name: string; address?: string };

export type SlotOption = {
  /** "HH:mm" */
  time: string;
  endTime?: string;
  doctorSlug: string;
  doctorName: string;
};

export type NextAvailable = { date: string; time: string; doctorSlug: string } | null;

export type BookingRequest = {
  fullName: string;
  phone: string; // normalised 10 digits
  email: string;
  branchId: string;
  treatmentLabel: string;
  doctorSlug: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm ("" = any time, enquiry/whatsapp only)
  otp?: string;
  honeypot?: string;
};

export type BookingResult =
  | {
      kind: 'booked';
      appointmentId: string;
      status: string; // exactly what the API returned, e.g. CONFIRMED / PENDING
      doctorName: string;
      branchName?: string;
      date: string;
      time: string;
      endTime?: string;
    }
  | { kind: 'enquiry'; leadId: string }
  | { kind: 'whatsapp'; href: string };

export type BookingDoctor = {
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
  clinicflowDoctorId: string | null;
  consultation: { days: Day[]; opens: string; closes: string }[];
};

export interface BookingService {
  readonly mode: BookingMode;
  /** true when getSlots returns live bookable times (otherwise the form asks for a preferred time). */
  readonly liveSlots: boolean;
  /** true when submitting requires the phone OTP step. */
  readonly requiresOtp: boolean;
  getBranches(): Promise<Branch[]>;
  getTreatments(): TreatmentGroup[];
  getAvailableDates(doctorSlugs: string[]): string[];
  getSlots(doctorSlugs: string[], branchId: string, date: string): Promise<SlotOption[]>;
  getNextAvailable(doctorSlugs: string[], branchId: string): Promise<NextAvailable>;
  sendOtp(phone: string, resend?: boolean): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
  book(req: BookingRequest): Promise<BookingResult>;
  submitEnquiry(req: BookingRequest): Promise<BookingResult>;
}
