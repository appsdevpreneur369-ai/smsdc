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
| Gallery photos | `content/gallery.json` | `image: null` shows a "Photo coming soon" tile. Before/after photos need the patient's written consent. |
| Menu and footer links | `content/navigation.json` | Labels come from the translation files. |
| Button labels, menu words, any interface text | `content/i18n/en.json` and `content/i18n/te.json` | The Telugu file is machine-drafted and needs review by a native speaker. |
| Telugu version of a content string | Change `"text"` into `{ "en": "text", "te": "తెలుగు" }` | Anything without Telugu falls back to English on the Telugu site. |

## Booking

`content/booking.json`:

- `mode: "whatsapp"` (current): step 3 opens WhatsApp with the patient's name, concern, preferred doctor and day already typed. The message wording is `whatsappMessage`.
- `mode: "clinicflow"`: set `clinicflowBookingUrl` to the clinic's ClinicFlow247 booking page (for example `https://<frontend>/book/<clinic-slug>`). If the URL is empty, the site stays on WhatsApp.
- `clinicflowDoctorParam`: leave `null` for now. The ClinicFlow247 booking page does not yet accept a pre-selected doctor, so the site tells the patient which doctor to choose. Once ClinicFlow supports it, set the parameter name here and fill each doctor's `clinicflowDoctorId`.
- `allowDirectSpecialistBooking: false` sends every patient to `defaultDoctor` (Dr. Suhasini) first.

## Other switches (environment variables)

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true` | Shows "Draft" badges on unapproved content. |
| `NEXT_PUBLIC_SITE_URL` | Public address used in canonical links, sitemap and share cards. Defaults to `clinic.json → siteUrl`. |
| `NEXT_PUBLIC_NOINDEX=true` | Asks search engines not to index a preview deployment. |

These are read when the site is built, so rebuild (or restart `npm run dev`) after changing them.

## Useful commands

```bash
npm run dev        # local preview at http://localhost:3000
npm run build      # production build (also validates all content)
npm run brand      # regenerate logo, illustrations and favicons from brand.json
npm run contrast   # check colour contrast of the palette
npm run lint
npm run typecheck
```
