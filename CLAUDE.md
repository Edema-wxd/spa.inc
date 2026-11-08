# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Spa.Inc is an admin and staff dashboard for spa / massage businesses: booking calendar, clients,
staff schedules, payments, revenue analytics, expenses and P&L, plus public marketing pages (landing, pricing,
contact sales). The original product spec is `raw.txt`; `README.md` has the current overview.

**Current state:** sign-up, email-code sign-in and a 14-day reverse trial work; by default
everything runs against an in-memory store with on-screen demo codes, so no database or email
provider is required. `/demo` signs a visitor into the sample business seeded by
`src/server/demo/seed.ts` (12 months of a seven-therapist spa). Every page reads services; never
import seed data into pages or client components. Auth setup is `docs/AUTH.md`. The roadmap with action steps
is `docs/ACTION_PLAN.md`.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build (runs the TypeScript check too)
npm run lint         # eslint (flat config, next core-web-vitals + typescript)
npm run typecheck    # tsc --noEmit
npm run db:generate  # Prisma client -> src/generated/prisma (also runs on postinstall)
npm run db:validate  # validate prisma/schema.prisma
```

There is no test suite. Validate changes with `npm run lint`, `npm run typecheck` and
`npm run build`. To preview empty states, build/run with `NEXT_PUBLIC_DEMO_EMPTY=true`.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config`)
- shadcn/ui ("new-york" style) on the unified `radix-ui` package, components in `src/components/ui/`
- Recharts for charts, TanStack Table for tables
- react-hook-form + zod 4 + `@hookform/resolvers`
- Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`, config in `prisma.config.ts`)
- date-fns, lucide-react, sonner

## Layout

```
prisma/schema.prisma        multi-tenant Postgres schema (organizations, subscriptions, locations, ...)
src/app/
  api/                      route handlers - thin: validate, call a service, return the envelope
  dashboard/                server layout (loads plan) + modules; gated segments have a layout.tsx
  book/[slug]/              public booking page, client manage page, demo checkout
  pricing/, contact-sales/  public pages
src/server/                 server-only code
  context.ts                getRequestContext() / getPageContext(): org, user, role, plan from the session
  auth/                     Supabase email codes or demo codes, signed cookies (signed.ts)
  services/accounts.ts      sign-up, sign-in, business creation; onboarding.ts, catalog.ts (services)
  entitlements.ts           assertFeature / assertCanAdd / assertRole
  errors.ts, http.ts        ApiError types, route() wrapper, ok()/created(), parseBody/parseQuery
  services/                 business rules per domain - the only place plan/role checks live
                            business.ts: getBusinessClock (timezone, today), lookups, local-date queries
                            scheduling.ts: availability engine and clash/working-hours rules
                            online-booking.ts, deposits.ts, messaging.ts, reminders.ts: item 2
  payments/                 deposit providers: Paystack, Stripe Checkout, demo
  messaging/whatsapp.ts     WhatsApp Cloud API adapter and webhook signature check
  rate-limit.ts, booking-lock.ts, app-url.ts
  repositories/             types.ts (interfaces), memory.ts (default), prisma.ts; getRepositories()
  demo/                     server-only demo seed (seed.ts generates bookings, payments, expenses)
src/lib/
  plans.ts                  SINGLE SOURCE OF TRUTH for plan limits and features
  pricing.ts                prices (USD + NGN), marketing copy, comparison table (derived from plans.ts)
  region.ts                 visitor country -> pricing currency
  validation/               zod schemas shared by forms and API routes
  api-client.ts             apiFetch() for client components
  time.ts                   business-timezone helpers (date keys, zonedTimeToUtc, formatInZone)
  ranges.ts                 report periods for ?range=30d|90d|12m
src/components/
  ui/                       shadcn primitives - avoid hand-editing, regenerate with the shadcn CLI
  shared/                   PageHeader, DataTable, ChartWrapper, EmptyState, SummaryCard, ...
  plan/                     PlanProvider/usePlan, RequireFeature, FeatureGate, UpgradePrompt, meters
  layout/                   dashboard shell, sidebars, header, nav-items.ts, session-user (signed-in user)
  calendar/                 calendar view, booking dialog, appointment sheet
  booking/                  public booking flow, manage actions
  online-booking/           dashboard share card, booking rules form, message log
  settings/, pricing/, ...  feature components
src/generated/              Prisma client output (gitignored)
```

## Conventions

- Default to Server Components; `"use client"` only for state, effects or handlers. Pass data
  from server pages into small client components (see `clients/page.tsx` -> `ClientsTable`).
  Column definitions contain functions, so wrap `DataTable` in a client component when the page
  is a server component.
- Data flow is route -> service -> repository. Never access storage from a route or a page
  directly; use a service (or `getRepositories()` for simple reads in server pages).
- Every repository method takes `organizationId`. Keep both repository implementations in sync
  when changing `repositories/types.ts`.
- API responses always use `{ data, error, message, details? }` via `ok()` / `created()` and
  thrown `ApiError`s; wrap handlers in `route()`.
- Put zod schemas in `src/lib/validation/` and import them in both the form and the route.
- Dynamic route `params` are a `Promise` in Next 16: `const { id } = await params`.
- Client components using `useSearchParams` must be wrapped in `<Suspense>` by their page.
- Use the `@/` path alias. Compose classes with `cn()`.
- Brand colors are Tailwind theme tokens: `spa-primary`, `spa-accent`, `spa-50` ... `spa-900`,
  `spa-surface`. Prefer these over raw hex.
- Dashboard money is integer **cents** (USD), rendered with `formatCurrency()`. Pricing amounts
  are whole units per currency, rendered with `formatPrice(amount, currency)`. Don't mix them.
- New dashboard pages: add the route under `src/app/dashboard/`, register it in
  `src/components/layout/nav-items.ts` (with `feature` if plan-gated), and start with `<PageHeader />`.
- Every list, table and chart needs an empty state (`EmptyState`, `DataTable emptyState`,
  `ChartWrapper isEmpty`).
- Forms: zod schema + `zodResolver`, submit with `apiFetch`, show field errors as
  `text-xs text-destructive`, `router.refresh()` after mutations so plan usage updates.
- Do not use em dashes in user-facing copy; use commas or hyphens.
- Time: appointments are UTC instants; days, "today" and working hours are in the location's
  timezone. Use `getBusinessClock(ctx)` and `src/lib/time.ts`, never `new Date()` day math or
  date-fns `startOfDay` on the server. Payment and expense dates are business-local date keys.
  Return display dates from services as date keys (`"yyyy-MM-dd"`) so they don't shift per viewer.
- Bookings: all scheduling rules (clashes, working hours, bookable staff, holds) live in
  `src/server/services/scheduling.ts`; the calendar and public page only offer what the
  availability endpoints return. Wrap "check then insert" in `withBookingLock(orgId, ...)`.
- Auth: API routes call `getRequestContext()` (throws 401); pages and layouts call
  `getPageContext()` (redirects to `/login`, and keeps staff on `/dashboard/calendar`).
  `src/proxy.ts` only does a cookie check and Supabase refresh; the real check is the context.
  Every query is scoped by `ctx.organizationId`; never take an organization id from the client.
- Who takes bookings is `users.is_bookable`, not `role === "STAFF"` (owners can be bookable).
- Link to `/demo` with a plain `<a>`, never `next/link`: a prefetch would sign the visitor in.
- Public routes (`/book`, `/api/public`, webhooks, cron) have no session: they use
  `getSystemContext(orgId)` and only call the online-booking, deposit and messaging services.
  Address a client's booking by its `manage_token`, never by id.
- Payments are confirmed only by a signature-checked webhook or a server-side provider
  verification, never by query parameters. Messages go through `sendClientMessage`, which
  never throws and records SIMULATED messages when no provider is configured.
- The memory repository returns copies from `get`/`update`; don't rely on mutating rows.
- Gated pages: the segment layout renders the upgrade prompt, and the page itself returns `null`
  when the plan lacks the feature (pages and layouts render in parallel, and services throw).
- Never show invented numbers. Comparisons must be like-for-like (same weekdays, complete
  periods) and partial periods must be labelled.

## Plans

- Limits and features: `src/lib/plans.ts`. Change them there; pricing table, UI locks and API
  enforcement all follow.
- Enforce on the server in the service (`assertFeature`, `assertCanAdd`). UI gating
  (`RequireFeature` in a segment layout, `FeatureGate`, `AddResourceButton`, `LimitBanner`) is
  for UX only and never replaces the server check.
- Downgrades keep existing data; they only block adding more.
- Online booking is on every plan; deposits and WhatsApp reminders start at Manager. Online
  bookings are never refused for the client limit.
- A real business's plan is `subscriptions.plan`; while `TRIALING` and before `trial_ends_at`
  the effective plan is `executive` (reverse trial). The demo business's plan lives in the
  `spa-plan` cookie (default `executive`). Both change via `PUT /api/plan` from Settings >
  Plan & Billing (for a trial, it picks the plan the trial continues on).

| Tier | Audience | USD | NGN | Admins | Clients | Locations |
|------|----------|-----|-----|--------|---------|-----------|
| Essentials | Single users, 14-day trial | $19 | ₦15,000 | 1 | 50 | 1 |
| Manager (Most Popular) | Small stores, one office | $49 | ₦35,000 | 3 | 200 | 1 |
| Executive | Established single-office stores | $99 | ₦75,000 | Unlimited | 500 | 1 |
| Enterprise | Multiple locations | Custom (`/contact-sales`) | Custom | Unlimited | Unlimited | Unlimited |

- Pricing is USD everywhere except Nigeria (NGN), detected from geo headers, overridable with
  `?region=ng|intl`. All prices are placeholders pending business sign-off.
- Annual billing is `ANNUAL_DISCOUNT` (10%) off. Support level is the same on every tier.
- `/contact-sales` accepts `?plan=<tierId>` and `?addon=<addOnId>` to prefill the form.

## Known gaps

- No billing yet: a trial simply moves to its chosen plan when it ends (item 4).
- Sign-in is email only (no phone/WhatsApp codes) and team members get no invite email.
- Staff can still read every client and booking through the APIs (item 6).
- `/demo` needs the memory store (or `ALLOW_DEMO=true` plus a seeded database, not written yet).
- The in-memory store resets on restart and is per server instance.
- Email confirmations and sales lead alerts only log to the console. WhatsApp messages and
  deposits run in demo mode until provider keys are set (docs/ONLINE_BOOKING.md).
- Rate limits and the booking lock are per server process.
- No database seed script or migrations committed yet (the demo seed only fills the memory store).
- Money is always shown in USD, even for NGN customers (see docs/ACTION_PLAN.md item 4).
