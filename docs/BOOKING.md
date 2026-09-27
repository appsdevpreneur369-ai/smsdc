# Booking popup and ClinicFlow247 integration

The "Book Your Appointment" popup (and the full-page form on `/book`) books real appointments in ClinicFlow247 when it can, and otherwise falls back to an enquiry or WhatsApp. It never shows a booking as done unless the API confirmed it.

## Modes

| Mode | What submit does | What the patient sees | Needs |
| --- | --- | --- | --- |
| `clinicflow` | Sends a 6-digit code to the phone (`POST /auth/otp/send`), then `POST /appointments/guest-book` with the code | "Appointment requested" + doctor, date, time, **status exactly as returned** (e.g. `CONFIRMED`), Add to calendar, directions | Clinic onboarded in ClinicFlow (slug), ≥1 active branch, website doctors matched to ClinicFlow doctors, **this site's origin in the API's CORS list** |
| `enquiry` | `POST /clinics/public/{slug}/leads` | "Request received — we'll call you to confirm a time" | Clinic onboarded, CORS |
| `whatsapp` | Opens `wa.me` with the details pre-filled; no network | "Continue on WhatsApp" (never "booked") | nothing |

`content/booking.json → mode` is the preferred mode. On first use (and in the background ~3 s after page load) the site runs a health check and picks the first mode that works:

1. `apiBaseUrl` and `clinicSlug` configured
2. `GET /clinics/public/{slug}` through our proxy → clinic exists (404 → "clinic not found")
3. The same GET straight from the browser → our origin is allowed by CORS (a network error here means it is not)
4. (`clinicflow` only) branches and doctors load, and at least one website doctor matches a ClinicFlow doctor

clinicflow → enquiry → whatsapp. The reason for any fallback is logged in the browser console as `[booking] using "…" mode. …`.

## Configuration

`content/booking.json`

- `clinicflow.apiBaseUrl` (production API by default), `clinicflow.clinicSlug`, `clinicflow.clinicId` (optional — looked up from the slug)
  - Build-time overrides: `NEXT_PUBLIC_CLINICFLOW_API_URL`, `NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG`, `NEXT_PUBLIC_CLINICFLOW_CLINIC_ID` (staging builds point `NEXT_PUBLIC_CLINICFLOW_API_URL` at the staging API).
- `advanceDays`, `otpResendSeconds`, `allowDirectSpecialistBooking`, `defaultDoctor`, `generalOption`
- `popup`: `enabled`, `delaySeconds`, `oncePerSession`, `showOnMobile`, `excludedPaths`
- `consent`, `whatsappMessage`, `enquiryMessage`, `note` (wording; `{{name}}`, `{{phone}}`, `{{email}}`, `{{problem}}`, `{{doctor}}`, `{{day}}`, `{{time}}`, `{{clinic}}`)

Treatment → doctor mapping is content, not code: `routing.json` problems, `services.json` categories/sub-treatments (`doctors`, with per-sub-treatment overrides), `booking.json → generalOption`. When an option has several doctors (e.g. oral surgery), slots for all of them are fetched and merged, each time labelled with the doctor's name. A doctor page pre-selects that doctor and narrows the slots to them.

Website doctors are matched to ClinicFlow doctors by `clinicflowDoctorId` if set in `doctors.json`, otherwise by first name (+ last name when the website has one), ignoring "Dr." and case.

## How the calls are made (and why)

| Call | Route | Why |
| --- | --- | --- |
| Clinic, branches, doctors, slots, next-available (GET) | Same-origin proxy `src/app/api/clinicflow/[...path]` → API | Works without CORS; allow-listed paths only; cached 15–300 s (`?fresh=1` bypasses the cache right before booking and after a slot turns out to be taken) |
| OTP send/resend, guest-book, leads (POST) | **Browser → API directly** | Guest booking is rate-limited **5 per 15 min per IP**. Through our server every visitor would share one IP. |

`verifyOtp` only checks the format: `guest-book` verifies the code itself (same as ClinicFlow's own `/book/{slug}` page). Calling `/auth/otp/verify` first could consume the code with the live SMS provider and make the booking fail.

Right before `guest-book` the chosen slot is re-checked (uncached). If it has gone — or the API answers 409 — the patient sees "That time was just booked — please pick another", the slots reload and everything else they typed is kept.

Error handling: network / 4xx / 5xx / 429 each show a plain message plus **"WhatsApp us instead"** pre-filled with what they entered. The form data is kept (also when the popup is closed and reopened during the visit).

## Enabling real booking on staging / production (ClinicFlow side — needs explicit approval)

1. **Onboard the clinic** (Track B): import `clinicflow-api/tools/tenant-onboarding/suhasini.json` into the target environment so `GET /clinics/public/suhasini-dental-clinic-and-implant-centre` returns 200 with an active branch and the 7 doctors (with schedules so slots exist).
2. **Allow this site's origin (CORS)** — no code change needed. The API binds `app.cors.allowed-origins` (a list, `application-prod.yaml`) through Spring Boot relaxed binding, so the env var `APP_CORS_ALLOWEDORIGINS` (comma-separated) **replaces** the list. It must repeat the existing origins. For staging:

   ```bash
   gcloud run services update clinicflow-api-staging \
     --project sincere-stock-499113-f1 --region asia-south1 \
     --update-env-vars '^@^APP_CORS_ALLOWEDORIGINS=https://clinicflow247.com,https://www.clinicflow247.com,https://clinicflow-frontend-1071497363324.asia-south1.run.app,https://clinicflow-frontend-staging-1071497363324.asia-south1.run.app,https://smsdc-frontend-staging-1071497363324.asia-south1.run.app'
   ```

   (`^@^` switches gcloud's list delimiter so the commas stay inside the value; `--update-env-vars` leaves every other variable untouched.) This creates a new API revision.
3. Build the site with `NEXT_PUBLIC_CLINICFLOW_API_URL=<that API>/api/v1`. Nothing else changes: the health check picks `clinicflow` automatically.

On staging the OTP is `123456` (SMS dry-run). Real SMS OTP is blocked on a DLT template (SMSDC_PendingItems.md 1.2).

## Testing

- Unit tests: `npm test` — phone/email validation, popup trigger rules, treatment→doctor mapping, fallback selection (health check with a stubbed `fetch`), `.ics`.
- End to end (test-only mock of the API; nothing here ships):

  ```bash
  NEXT_PUBLIC_CLINICFLOW_API_URL=http://localhost:4010/api/v1 npm run build
  MOCK_SCENARIO=ok node scripts/harness/mock-clinicflow.mjs &     # ok | enquiry | error500 | ratelimit
  node node_modules/next/dist/bin/next start -p 3100 &
  node scripts/harness/e2e-booking.mjs http://localhost:3100 qa-booking clinicflow   # or errors-500 | errors-429 | enquiry
  ```

  Delete `.next/cache/fetch-cache` between scenarios (the proxy caches upstream GETs on disk). The `fallback` suite runs against a build pointed at the real staging API.
