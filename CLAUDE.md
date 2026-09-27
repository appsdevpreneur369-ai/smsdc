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

Matches `clinicflow-frontend` so components can merge later: Next.js 14 App Router, TypeScript strict, Tailwind, next/font (Poppins + Manrope), next/image, framer-motion, lucide-react, zod. No backend, database or auth in this repo.

- Routing: all pages live in `src/app/[lang]/`. `src/middleware.ts` rewrites root paths to `/en/*` (English at `/about`) and serves Telugu at `/te/*`. `/en/*` redirects to the root.
- Server components read content directly. **Client components must not import `src/lib/content`** (it would ship zod + all JSON to the browser); pass resolved strings as props.
- Logo: the clinic's own `logo.png` (supplied 27 Sep 2026; background removed) in `public/brand/` — `logo.png`, `logo-white.png` (dark backgrounds), `logo-1024.png` (master). The header title is text (`brand.json wordmark`) in Roboto (`fonts.logo`), not an image. The palette in `brand.json` is sampled from the logo.
- `npm run brand` regenerates the illustrations (in `brand.json` colours) and the favicon/app icons (from the logo master) — `scripts/generate-brand-assets.mjs`.

## Booking

Config in `content/booking.json`. `/book` is a 3-step wizard (problem → recommended doctor from `routing.json` → hand-off).

- `mode: "clinicflow"` opens `clinicflowBookingUrl` (ClinicFlow247 `/book/<slug>`). As of 27 Sep 2026 that page does **not** read a doctor pre-select param, so `clinicflowDoctorParam` is `null`; the wizard tells the patient which doctor to pick.
- `mode: "whatsapp"` (and the fallback when the URL is empty) opens `wa.me` with a prefilled message.
- Do **not** call the ClinicFlow API from the browser (CORS not configured) and do **not** proxy guest booking through a server (rate-limited per IP). See `../SMSDC_PendingItems.md`.

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
