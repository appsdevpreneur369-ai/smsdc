# CLAUDE.md — SMSDC public website

Public marketing website for **Suhasini Dental Clinic and Implant Centre** (project code SMSDC), a white-label client of ClinicFlow247. First cut built for the owner demo on **Tue 29 Sep 2026**.

## The one rule: everything is a placeholder

The clinic has not approved any content. **No content string, colour, image path, phone number, timing, doctor or service may be hard-coded in a component.**

- All content lives in `/content` (JSON + Markdown) and is loaded through `src/lib/content` (zod-validated; bad content fails the build with the file and field named).
- Every record has `"status": "placeholder" | "approved"`. `NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true` shows a "Draft" badge on placeholder items (`DraftBadge`).
- Colours and fonts come from `content/brand.json` → CSS variables (`src/lib/theme.ts`) → Tailwind theme (`tailwind.config.ts`). Never write a hex value or `text-[#…]` in a component.
- Images are referenced by id through `content/images.json` (`ContentImage`, `getImage`). Never reference `/images/...` paths directly in components.
- Numbers shown in copy come from `{{tokens}}` filled from content (`src/lib/vars.ts`: `doctorCount`, `categoryCount`, `area`, `hoursSummary`, …) so they never drift.
- UI chrome strings live in `content/i18n/en.json` / `te.json`. Telugu is machine-drafted, pending review; long-form content falls back to English.
- Never fabricate reviews, ratings, patient counts, awards or experience. Never show stock photos of people as our doctors (initials avatars until real headshots). Prices are not published. Medical wording stays cautious ("linked with", "may help").

`docs/EDITING.md` tells the clinic team which file to edit for each change. Keep it current.

## Stack

Matches `clinicflow-frontend` so components can merge later: Next.js 14 App Router, TypeScript strict, Tailwind, next/font (Poppins + Manrope), next/image, framer-motion, lucide-react, zod. No backend or database in this repo; patient sign-in is ClinicFlow's (below).

- Routing: all pages live in `src/app/[lang]/`. `src/middleware.ts` rewrites root paths to `/en/*` (English at `/about`) and serves Telugu at `/te/*`. `/en/*` redirects to the root.
- Server components read content directly. **Client components must not import `src/lib/content`** (it would ship zod + all JSON to the browser); pass resolved strings as props.
- Logo: the clinic's own `logo.png` (supplied 27 Sep 2026; background removed) in `public/brand/` — `logo.png`, `logo-white.png` (dark backgrounds), `logo-1024.png` (master). The header title is text (`brand.json wordmark`) in Roboto (`fonts.logo`), not an image. The palette in `brand.json` is sampled from the logo.
- `npm run brand` regenerates the illustrations (in `brand.json` colours) and the favicon/app icons (from the logo master) — `scripts/generate-brand-assets.mjs`.

## Booking

Popup + form connected to ClinicFlow247 — see `docs/BOOKING.md`. Config: `content/booking.json`. Code: `src/lib/booking/*` (pure rules, zod API schemas, `BookingService` + ClinicFlow/Enquiry/WhatsApp implementations, fallback), `src/components/booking/*` (provider, modal, form), `src/app/api/clinicflow/[...path]` (read-only GET proxy).

- GETs (clinic, branches, doctors, slots, next-available) go through the same-origin proxy (short cache, allow-listed paths).
- POSTs (OTP send/resend, guest-book, leads) go **straight from the browser** — never proxy them: guest-book is rate-limited 5/15 min per IP. They need this site's origin in the API's CORS list (`APP_CORS_ALLOWEDORIGINS` env on the API, see docs/BOOKING.md).
- Health check + automatic fallback clinicflow → enquiry → whatsapp; never a fake success; no mock service in `src/` (mocks only in `tests/` and `scripts/harness/`).
- `verifyOtp` is a format check only: guest-book verifies the OTP itself (like ClinicFlow's own /book page); calling /auth/otp/verify first could consume the code.
- Patient accounts (ClinicFlow PATIENT logins): `src/lib/account/*`, `src/components/account/*`, `/account`. Guest (OTP) or signed-in (slot lock + `POST /appointments`, no OTP). Tokens only in `sessionStorage` and the `Authorization` header — never log them, never proxy them, never put them in URLs. Staff logins are refused.
- Don't pin `clinicflowDoctorId` in `doctors.json` with staging IDs: the file feeds production builds too (name matching works).
- Tests: `npm test` (vitest, pure rules + stubbed fetch). End-to-end against a production build + test-only mock API: `scripts/harness/mock-clinicflow.mjs` + `scripts/harness/e2e-booking.mjs` (see docs/BOOKING.md).

## How content maps to ClinicFlow247 (`walkwell.json` tenant schema)

| This repo | ClinicFlow247 tenant JSON |
| --- | --- |
| `clinic.json` name/address/phone/email/whatsapp/slug/description | `clinic.*` |
| `clinic.json` hours (sessions per day) | `clinic.businessHours[]` (single open/close today — schema gap for split sessions) |
| `brand.json` colors/fonts/wordmark | `clinic.themeTokens.*` |
| `doctors.json` | `doctors[]` (slug, Telugu line, expertise, consultation, avatar are extensions) |
| `home.json` hero | `heroBanners[0]` |
| `services.json` sub-treatments | `treatments[]` (category = category title) |
| service FAQs + `faqs.json` | `faqs[]` |
| `why-us.json` steps | `processSteps[]` |
| `content/education/*.md`, `content/legal/*.md` | `contentPages[]` |
| `reviews.json` | no testimonials by design; review link → `clinics.google_review_link` |

Components may merge into core later, but **content may not**: core forbids tenant-identity conditionals, so this content must become Clinic data rows.

## Checks before calling anything done

`npm run lint`, `npx tsc --noEmit`, `npm run build` all pass; check pages at 360 px and 1280 px. Never modify anything under `D:\ClinicFlow`. Ask before deploying anywhere.

## Deployments

Manual, same approach as ClinicFlow247 (no CI/CD): build the image locally, push to Artifact Registry, `gcloud run deploy`. Never touch other services, `clinicflow-lb`, certs, DNS or the ClinicFlow API.

| Item | Value |
| --- | --- |
| Repo | https://github.com/appsdevpreneur369-ai/smsdc (`main`; pushed over HTTPS — this PC has no GitHub SSH key) |
| GCP | project `sincere-stock-499113-f1`, region `asia-south1` |
| Image | `asia-south1-docker.pkg.dev/sincere-stock-499113-f1/clinicflow/smsdc-frontend:<git short SHA>` |
| Staging service | `smsdc-frontend-staging` — 256Mi, 1 CPU, min-instances 0, unauthenticated |
| Staging URL | https://smsdc-frontend-staging-1071497363324.asia-south1.run.app |
| Staging build args | `NEXT_PUBLIC_SITE_ENV=staging` (X-Robots-Tag noindex, robots Disallow: /, meta noindex), `NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true`, `NEXT_PUBLIC_NOINDEX=true`, `NEXT_PUBLIC_SITE_URL=<staging URL>`, `NEXT_PUBLIC_CLINICFLOW_API_URL=<staging API>`, `NEXT_PUBLIC_BOOKING_OTP_HINT=123456` (staging only) |
| ClinicFlow staging API | `clinicflow-api-staging` rev `00064-nw2`: this origin in `APP_CORS_ALLOWEDORIGINS`, `EMAIL_ENABLED=true`, SMS/WhatsApp off (OTP 123456). Suhasini clinic onboarded + ACTIVE (SMSDC_PendingItems 10). Changing its env needs the owner's explicit yes; always `--update-env-vars`. |
| Staging API warm instance | 28 Sep: `--min-instances=1` (rev `00065-x5t`, same image/env) so booking doesn't fall back to WhatsApp on a ~54 s cold start. **Revert after the demo** (`--min-instances=0`, SMSDC_PendingItems 11.9). |

History (staging):

| Date | Commit / image tag | Revision | Notes |
| --- | --- | --- | --- |
| 2026-09-27 | `4978932` | `smsdc-frontend-staging-00001-25d` | First deploy. `/og` returned 500 (self-fetch). |
| 2026-09-27 | `7eb8958` | `smsdc-frontend-staging-00002-wkz` | OG logo embedded at build time. |
| 2026-09-27 | `afc693e` | `smsdc-frontend-staging-00003-sql` | Draft badge readable on dark cards. |
| 2026-09-27 | `d01b828` | `smsdc-frontend-staging-00004-mgs` | Booking popup + ClinicFlow integration; built against the staging API → falls back to WhatsApp until the clinic is onboarded and CORS allows this origin (SMSDC_PendingItems 9.1/9.2). |
| 2026-09-27 | `433f9cf` | `smsdc-frontend-staging-00005-92t` | Patient accounts (sign up/in, book without OTP, My appointments, cancel) + OTP hint. Live-verified against the staging API: guest + patient bookings CONFIRMED, confirmation emails logged as sent. |
| 2026-09-28 | `3ee5bda` | `smsdc-frontend-staging-00006-lsf` | Closing popup no longer swallows clicks; offline modes list 30-min times (`consultSlotMinutes`) instead of sessions. Re-verified live in Chrome (guest + OTP) and by script (account flow). |
| 2026-09-28 | `6d05467` | `smsdc-frontend-staging-00007-8xt` | `consultSlotMinutes` 15 (ClinicFlow staging doctors also set to 15 min). Live: 15-min slots (Dr. Suhasini 28 on a weekday, consultants 12); account booking 5:15–5:30 PM CONFIRMED, then cancelled. **Current.** |

Redeploy staging (all NEXT_PUBLIC_* values are baked in at build time):

```bash
SHA=$(git rev-parse --short HEAD)
IMG=asia-south1-docker.pkg.dev/sincere-stock-499113-f1/clinicflow/smsdc-frontend:$SHA
docker build \
  --build-arg NEXT_PUBLIC_SITE_ENV=staging \
  --build-arg NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true \
  --build-arg NEXT_PUBLIC_NOINDEX=true \
  --build-arg NEXT_PUBLIC_SITE_URL=https://smsdc-frontend-staging-1071497363324.asia-south1.run.app \
  --build-arg NEXT_PUBLIC_CLINICFLOW_API_URL=https://clinicflow-api-staging-znvqdsvqkq-el.a.run.app/api/v1 \
  --build-arg NEXT_PUBLIC_BOOKING_OTP_HINT=123456 \
  -t $IMG .
docker push $IMG
gcloud run deploy smsdc-frontend-staging --project sincere-stock-499113-f1 --region asia-south1 --image $IMG
```

Then: curl `/`, `/doctors`, `/treatments` (308 → `/services`), `/book`, `/account`, `/contact`, `/og?title=x` and check zero ERROR logs for the new revision.
