# Suhasini Dental Clinic & Implant Centre — website (SMSDC)

First-cut public website for a ClinicFlow247 white-label clinic in Tadepalle, Andhra Pradesh. **All content is placeholder** until the clinic approves it.

```bash
npm install
npm run dev            # http://localhost:3000   (Telugu: http://localhost:3000/te)
```

Show pending items during a review:

```bash
# PowerShell
$env:NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES="true"; npm run dev
# bash
NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=true npm run dev
```

- **Change any content:** see [`docs/EDITING.md`](docs/EDITING.md). Everything lives in `/content`.
- **Project rules, architecture and the ClinicFlow247 mapping:** see [`CLAUDE.md`](CLAUDE.md).
- Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, framer-motion, lucide-react, zod.
