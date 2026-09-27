# SMSDC public website — modelled on clinicflow-frontend's Dockerfile
# (multi-stage, node:20-alpine, Next.js standalone output, non-root user, port 3000).

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci), same as clinicflow-frontend: the lockfile is written by a newer local npm.
RUN npm install --no-audit --no-fund

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public, build-time settings (inlined into the client bundle). No secrets here.
ARG NEXT_PUBLIC_SITE_ENV=production
ARG NEXT_PUBLIC_SITE_URL=
ARG NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=false
ARG NEXT_PUBLIC_NOINDEX=false
# ClinicFlow247 API for the booking popup (empty = content/booking.json default, the production API)
ARG NEXT_PUBLIC_CLINICFLOW_API_URL=
ARG NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG=
ARG NEXT_PUBLIC_CLINICFLOW_CLINIC_ID=
# Staging/demo only: shows "use code …" on the OTP step while SMS is in dry-run. Never set for production.
ARG NEXT_PUBLIC_BOOKING_OTP_HINT=
ENV NEXT_PUBLIC_SITE_ENV=$NEXT_PUBLIC_SITE_ENV
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES=$NEXT_PUBLIC_SHOW_PLACEHOLDER_BADGES
ENV NEXT_PUBLIC_NOINDEX=$NEXT_PUBLIC_NOINDEX
ENV NEXT_PUBLIC_CLINICFLOW_API_URL=$NEXT_PUBLIC_CLINICFLOW_API_URL
ENV NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG=$NEXT_PUBLIC_CLINICFLOW_CLINIC_SLUG
ENV NEXT_PUBLIC_CLINICFLOW_CLINIC_ID=$NEXT_PUBLIC_CLINICFLOW_CLINIC_ID
ENV NEXT_PUBLIC_BOOKING_OTP_HINT=$NEXT_PUBLIC_BOOKING_OTP_HINT
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -S smsdc && adduser -S smsdc -G smsdc

# Standalone server + static assets + public files. content/ is read at runtime by the Markdown loader.
COPY --from=builder --chown=smsdc:smsdc /app/.next/standalone ./
COPY --from=builder --chown=smsdc:smsdc /app/.next/static ./.next/static
COPY --from=builder --chown=smsdc:smsdc /app/public ./public
COPY --from=builder --chown=smsdc:smsdc /app/content ./content

USER smsdc

EXPOSE 3000

CMD ["node", "server.js"]
