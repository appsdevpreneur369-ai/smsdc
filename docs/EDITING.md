# Editing the Suhasini Dental website

Everything a visitor sees comes from the **`/content`** folder. You never need to touch the code in `/src` to change text, timings, doctors, treatments, colours or photos.

After editing, run `npm run dev` and check the page. If you make a typo in a JSON file (a missing comma, a wrong doctor name), the site shows an error that names the file and the field, so it can't go live broken.

> **Status flags.** Almost every record has `"status": "placeholder"`. Once the clinic approves an item, change it to `"approved"`. Start the site with `NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true` to see a small **Draft** badge on everything still pending.

## Where to change what

| I want to change… | Edit this file | Notes |
| --- | --- | --- |
| Phone, WhatsApp number, email, address | `content/clinic.json` | `phone.display` is what people see; `phone.e164` (e.g. `+919441411629`) is used for tap-to-call and WhatsApp links. |
| Clinic timings | `content/clinic.json` → `hours` | 24-hour `HH:MM`. A day with `"sessions": []` is closed. "Open now", the timings table, the footer, the FAQ answer and Google data all update automatically. |
| Exact map pin | `content/clinic.json` → `maps.embedUrl` | In Google Maps: *Share → Embed a map → copy the `src="…"` URL*. `geo.lat/lng` is used for Google search data. |
| Areas served (local SEO) | `content/clinic.json` → `serviceAreas` | |
| Social media icons in the footer (Instagram, YouTube, X, LinkedIn, Facebook) | `content/clinic.json` → `socialLinks` | Each key starts as `""`: the icon is shown but is **not clickable** (no link, not focusable). Paste the full address, e.g. `"instagram": "https://www.instagram.com/yourclinic"`, and it automatically becomes a link that opens in a new tab (`rel="noopener noreferrer"`). Must start with `https://` or the build reports the field. |
| Colours, fonts | `content/brand.json` | The palette is sampled from the clinic's logo. After changing colours run `npm run brand` (re-colours the illustrations) and `npm run contrast` (checks readability). `fonts.heading` / `fonts.body` / `fonts.logo` must be one of Poppins, Manrope, Inter or Roboto; to add another, a developer registers it once in `src/lib/theme.ts`. |
| Application title next to the logo | `content/brand.json` → `wordmark` (`primary` = "Suhasini", `secondary` = "Dental Clinic & Implant Centre") | Shown as text in the `fonts.logo` font (Roboto). |
| Logo | Replace `public/brand/logo.png` (transparent, square), `logo-white.png` (for dark backgrounds) and `logo-1024.png` (master), or point `content/images.json` → `logo`, `logo-white`, `logo-app-icon` at new files. | Then run `npm run brand` to regenerate the favicon and app icons from the master. |
| Any photo or illustration | Drop the file in `public/images/`, then change its `src` (and `width`, `height`, `alt`) in `content/images.json`. | Ids stay the same, so nothing else changes. Record `source` and `licence`. |
| Doctor photo | Add an entry in `content/images.json`, then set `avatar.image` to that id in `content/doctors.json`. | Until then an initials avatar is shown. Keep photos under 2 MB. |
| Doctors: names, qualifications, bios, consultation hours, order | `content/doctors.json` | Order in the file = order on the site. Add `registrationNumber` when known. `clinicflowDoctorId` links to ClinicFlow247 later. |
| Treatments, sub-treatments, sittings, responsible doctor, treatment FAQs | `content/services.json` | A sub-treatment's `doctors` overrides its category's. Prices are intentionally not published; the wording shown instead is `pricingNote`. |
| "What's troubling you?" options and which doctor each goes to | `content/routing.json` | `mode: "any"` shows an "either doctor — whoever is available first" option. |
| Booking behaviour | `content/booking.json` | See **Booking** below. |
| Home page text (hero, trust strip, section headings, stat chips, CTA banner) | `content/home.json` | Use `{{doctorCount}}`, `{{categoryCount}}`, `{{area}}` instead of typing numbers. |
| Page titles, Google descriptions, page intros, About story | `content/pages.json` | |
| Why-us reasons, "Your visit in four steps" | `content/why-us.json` | |
| General FAQs | `content/faqs.json` | `"home": true` also shows the question on the home page. |
| Patient-education articles | `content/education/*.md` | One Markdown file per article. Change `reviewStatus: pending` to `reviewed` once Dr. Suhasini approves it. Add a new file to add an article. |
| Privacy, Terms, Disclaimer, Cookies | `content/legal/*.md` | Change `status: placeholder` to `approved` after legal review; that removes the "Draft" banner. |
| Emergency advice | `content/emergency.json` | |
| Google reviews card | `content/reviews.json` | Fill `rating`/`reviewCount` only with real numbers from Google. Never add review text by hand. `writeReviewUrl` = the "Ask for reviews" link from Google Business Profile. |
| Gallery photos | `content/gallery.json` (order + filter chips) and `content/images.json` (the photo itself) | See **Adding a gallery photo** below. Before/after photos need the patient's written consent. |
| Menu and footer links | `content/navigation.json` | Labels come from the translation files. |
| Button labels, menu words, any interface text | `content/i18n/en.json` and `content/i18n/te.json` | The Telugu file is machine-drafted and needs review by a native speaker. |
| Telugu version of a content string | Change `"text"` into `{ "en": "text", "te": "తెలుగు" }` | Anything without Telugu falls back to English on the Telugu site. |

## Adding a gallery photo

1. Put the original photo in `D:\SMSDC\SMSDC-Images` (this folder is **not** in git: originals never go online as they are).
2. Add one line to `scripts/process-clinic-photos.mjs → PHOTOS` with a descriptive file name, e.g. `{ src: 'IMG_2031.jpg', out: 'suhasini-dental-clinic-tadepalle-reception.jpg' }`.
3. Run `npm run photos -- "D:\SMSDC\SMSDC-Images"`. It writes `public/images/gallery/<name>.jpg`: max 1600 px wide, compressed, and **all EXIF/GPS data removed**. It prints each file's size (aim for under ~200 KB).
4. Add one entry to `content/images.json`:
   ```json
   "clinic-reception": {
     "status": "placeholder",
     "src": "/images/gallery/suhasini-dental-clinic-tadepalle-reception.jpg",
     "width": 1600, "height": 1200,
     "alt": { "en": "Reception and waiting area at Suhasini Dental Clinic, Tadepalle" },
     "caption": { "en": "Reception & waiting area", "te": "రిసెప్షన్" },
     "category": "clinic",
     "placement": ["gallery", "home"],
     "source": "Clinic-supplied photo", "licence": "Clinic's own photo"
   }
   ```
   - **alt**: what's in the photo plus the clinic, in plain words, up to ~125 characters. **caption**: short, shown under the photo and in the viewer.
   - **category**: `clinic`, `treatments` or `education` (the filter chips on `/gallery`).
   - **placement**: where else it appears: `home` ("Inside Our Clinic" strip, up to 6 photos), `about` (first = beside the About heading, second = next to the clinic story).
5. Add the id to `content/gallery.json → items` where it should appear in the gallery order.

A photo that isn't 4:3 (e.g. a square poster) is shown whole on a blurred background, never cropped. Never publish photos where patients can be recognised, or screens with patient records, without written consent.

## Booking popup and form

Everything is in `content/booking.json` (full technical detail: [`docs/BOOKING.md`](BOOKING.md)).

- **Popup** (`popup`): opens by itself after `delaySeconds` (8) on any page not in `excludedPaths`, **once per browsing session** — after it is closed, or after the visitor opened it from a button or booked, it never opens by itself again that session. `enabled: false` turns the automatic opening off (buttons still open it). `showOnMobile: false` stops it opening by itself on phones.
  - On phones it is a full-height sheet. Google penalises pop-ups that cover the page on mobile ("intrusive interstitials"), which is why it waits 8 seconds and only appears once — keep `delaySeconds` ≥ 8 and `oncePerSession: true`.
- **Every "Book Appointment" button** opens the same form. Doctor pages pre-select that doctor, treatment pages pre-select that treatment. `/book` shows the same form as a full page.
- **Mode** (`mode`): what happens on submit.
  - `"clinicflow"` — real booking in ClinicFlow247 with live time slots. The patient chooses **Book as guest** (a 6-digit code is sent to their phone, then the appointment is created) or **Sign in / Create account** (a ClinicFlow patient account: sign up once, then sign in and book without a code; they can see and cancel their bookings on **My account**, `/account`). Needs the clinic onboarded in ClinicFlow (`clinicflow.clinicSlug`) and this website's address allowed by the ClinicFlow API (CORS).
  - `"enquiry"` — sends the details to ClinicFlow as a lead; the patient sees "Request received — we'll call you to confirm a time".
  - `"whatsapp"` — no online system: opens WhatsApp with the details typed in; the patient sees "Continue on WhatsApp".
  - If the chosen mode isn't available (clinic not found, API down, website not allowed), the site **falls back automatically** clinicflow → enquiry → whatsapp. It never shows a booking as done unless ClinicFlow confirmed it.
- **Treatments and doctors**: the Treatment list and which doctor(s) each one is booked with come from `routing.json` ("What's troubling you?" options), `services.json` (categories and sub-treatments, with each one's doctors) and `booking.json → generalOption` ("Not sure – general check-up"). If a treatment has several doctors, their times are shown together with each doctor's name.
- **Dates** come from each doctor's `consultation` days in `doctors.json` (and, in ClinicFlow mode, the live slots). `advanceDays` (30) is how far ahead patients can book.
- **Wording**: consent text (`consent`), the WhatsApp message (`whatsappMessage`), the enquiry message (`enquiryMessage`) and the note under the form (`note`). Form labels and messages are in `content/i18n/en.json` / `te.json` → `bookingForm`; sign in / sign up / My account wording → `account` (appointment status names are `status_CONFIRMED` etc.). The My account page's heading and intro are in `pages.json → account`.
- `allowDirectSpecialistBooking: false` books every treatment with `defaultDoctor` (Dr. Suhasini) first.
- **Appointment length**: `doctors.json → consultSlotMinutes` (15). Live time slots come from ClinicFlow (each doctor's appointment length there); this number is used for the time list when the site can't reach ClinicFlow, so keep the two the same.
- **Linking a doctor to ClinicFlow**: doctors are matched to ClinicFlow by first (and last) name automatically. If a name differs in ClinicFlow, set that doctor's `clinicflowDoctorId` in `doctors.json`.

## Other switches (environment variables)

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true` | Shows "Draft" badges on unapproved content. |
| `NEXT_PUBLIC_SITE_URL` | Public address used in canonical links, sitemap and share cards. Defaults to `clinic.json → siteUrl`. |
| `NEXT_PUBLIC_NOINDEX=true` | Asks search engines not to index a preview deployment. |
| `NEXT_PUBLIC_CLINICFLOW_API_URL` | ClinicFlow API for booking (e.g. the staging API). Defaults to `booking.json → clinicflow.apiBaseUrl`. Also `NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG` / `NEXT_PUBLIC_CLINICFLOW_CLINIC_ID`. |
| `NEXT_PUBLIC_BOOKING_OTP_HINT` | **Staging/demo only.** Shows "Demo: … enter 123456" on the phone-code step while ClinicFlow's SMS is switched off. Never set it for the live site. |
| `NEXT_PUBLIC_SITE_ENV=staging` | Staging: never indexed by search engines. |

These are read when the site is built, so rebuild (or restart `npm run dev`) after changing them.

## Useful commands

```bash
npm run dev        # local preview at http://localhost:3000
npm run build      # production build (also validates all content)
npm run brand      # regenerate logo, illustrations and favicons from brand.json
npm run contrast   # check colour contrast of the palette
npm run lint
npm run typecheck
npm test           # unit tests (booking rules, validation, fallbacks)
```
