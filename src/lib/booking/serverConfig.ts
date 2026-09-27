import 'server-only';
import { booking } from '../content';

/** ClinicFlow API settings: content/booking.json, overridable per deployment via NEXT_PUBLIC_CLINICFLOW_* at build time. */
export function clinicflowApiConfig() {
  return {
    baseUrl: (process.env.NEXT_PUBLIC_CLINICFLOW_API_URL || booking.clinicflow.apiBaseUrl).replace(/\/$/, ''),
    clinicSlug: process.env.NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG || booking.clinicflow.clinicSlug,
    clinicId: process.env.NEXT_PUBLIC_CLINICFLOW_CLINIC_ID || booking.clinicflow.clinicId,
  };
}
