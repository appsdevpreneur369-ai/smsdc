# SEO: how the site is set up, and the go-live switch

Everything below is generated from `/content`, so it stays correct when content changes.

## Go-live: one switch

Staging is **deliberately not indexable**: `NEXT_PUBLIC_SITE_ENV=staging` sends `X-Robots-Tag: noindex, nofollow`, a
`<meta name="robots" content="noindex, nofollow">` on every page, and `robots.txt` → `Disallow: /`. Lighthouse on the staging URL
therefore reports one SEO failure, **"Page is blocked from indexing"**. That is expected and must stay until launch.

For the live site, build with:

| Variable | Live value | Why |
|---|---|---|
| `NEXT_PUBLIC_SITE_ENV` | `production` | Removes the noindex header/meta and the `Disallow: /` |
| `NEXT_PUBLIC_NOINDEX` | unset / `false` | Extra noindex switch for previews |
| `NEXT_PUBLIC_SITE_URL` | `https://<the clinic's domain>` | Canonical links, hreflang, sitemap, Open Graph and JSON-LD URLs are all built from it |

Then submit `https://<domain>/sitemap.xml` in Google Search Console.

## What every page has

| Item | Where it comes from |
|---|---|
| `<title>` | Page title + ` \| Suhasini Dental, Tadepalle` (layout template). `fitTitle()` in `src/lib/seo.ts` keeps it ≤ 60 characters (falls back to ` \| Suhasini Dental`, then shortens). The home page uses its own full title. |
| Meta description | `content/pages.json → description` (static pages), frontmatter `description` (articles, legal pages), built from the summary + clinic sentence for doctors and treatments. Written for 120–160 characters; `fitDescription()` caps at 160 on a word. |
| One `<h1>` | `PageHeader` (inner pages) / hero (home). Cards directly under the H1 use `<h2>` (`headingLevel`). |
| Canonical + hreflang | `pageMetadata()`: canonical = this page; `en-IN`, `te-IN`, `x-default` alternates. |
| `<html lang>` | `en` / `te` from the URL (`/te/*`). |
| Open Graph + Twitter | 1200×630 image: generated per page by `/og?title=…`; articles can set `ogImage` (e.g. the Healthy Gums poster card). `summary_large_image`. |
| Structured data (JSON-LD) | Every page: `Dentist` + `MedicalClinic` (name, address, geo, phone, opening hours, logo, clinic photos, `sameAs` only for filled social links, no `priceRange`: prices aren't published). Inner pages: `BreadcrumbList`. Doctors: `Physician`. Articles: `MedicalWebPage` (+ image). Gallery: `ImageGallery` of `ImageObject`s. FAQs (home, /faqs, treatment pages): `FAQPage`. |
| Images | `next/image` (AVIF/WebP, responsive `sizes`, width/height → no layout shift, lazy below the fold). Every image has alt text from `content/images.json`; decorative ones `alt=""`. |

## Sitemap and robots

- `/sitemap.xml` (`src/app/sitemap.xml/route.ts`): every page in English and Telugu with hreflang alternates, `lastmod` (build date), and `<image:image>` entries for the photos on the gallery, home, about and article pages.
- `/robots.txt`: `Allow: /` + sitemap link in production; `Disallow: /` on staging/previews.
- `/account` is `noindex` on purpose (personal page) and isn't in the sitemap.

## Checking it

```bash
# production-mode build (indexing allowed), booking API pointed at the test mock so no console errors
NEXT_PUBLIC_SITE_ENV=production NEXT_PUBLIC_SITE_URL=http://localhost:3100 NEXT_PUBLIC_CLINICFLOW_API_URL=http://localhost:4010/api/v1 npm run build
node scripts/harness/mock-clinicflow.mjs &  node node_modules/next/dist/bin/next start -p 3100 &
node scripts/harness/seo-audit.mjs http://localhost:3100 out.json          # titles, descriptions, H1, canonical, OG, JSON-LD, alts, links
node scripts/harness/lighthouse-all.mjs http://localhost:3100 docs/seo-reports/<date>/local both
```

Structured data: paste a page URL into https://validator.schema.org and https://search.google.com/test/rich-results (both work on
the noindex staging URL). Google only shows FAQ rich results for a few authoritative sites, so a valid `FAQPage` that isn't
displayed is expected.

Results of each audit run are in `docs/seo-reports/<date>/` (`summary.json`; the HTML reports stay local and aren't committed).
