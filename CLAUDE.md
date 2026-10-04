# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Spa.Inc is an admin and staff dashboard for spa / massage businesses: clients, staff schedules,
payments, revenue analytics, expenses and P&L, plus public marketing pages (landing, pricing,
contact sales). The original product spec is `raw.txt`; `README.md` has the current overview.

**Current state: demo.** No auth and no database are required. The backend layers exist
(API routes, services, repositories, Prisma schema) and run against an in-memory store seeded
from `src/lib/mock-data/`. Many dashboard pages still import mock data directly; migrate them to
services when you touch them (the clients list and Add Client flow are the reference examples).

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
  pricing/, contact-sales/  public pages
src/server/                 server-only code
  context.ts                getRequestContext(): organizationId, userId, role, plan (demo: cookie)
  entitlements.ts           assertFeature / assertCanAdd / assertRole
  errors.ts, http.ts        ApiError types, route() wrapper, ok()/created(), parseBody/parseQuery
  services/                 business rules per domain - the only place plan/role checks live
  repositories/             types.ts (interfaces), memory.ts (default), prisma.ts; getRepositories()
src/lib/
  plans.ts                  SINGLE SOURCE OF TRUTH for plan limits and features
  pricing.ts                prices (USD + NGN), marketing copy, comparison table (derived from plans.ts)
  region.ts                 visitor country -> pricing currency
  validation/               zod schemas shared by forms and API routes
  api-client.ts             apiFetch() for client components
  mock-data/                seed data + metric helpers used by pages not yet on services
src/components/
  ui/                       shadcn primitives - avoid hand-editing, regenerate with the shadcn CLI
  shared/                   PageHeader, DataTable, ChartWrapper, EmptyState, SummaryCard, ...
  plan/                     PlanProvider/usePlan, RequireFeature, FeatureGate, UpgradePrompt, meters
  layout/                   dashboard shell, sidebars, header, nav-items.ts
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

## Plans

- Limits and features: `src/lib/plans.ts`. Change them there; pricing table, UI locks and API
  enforcement all follow.
- Enforce on the server in the service (`assertFeature`, `assertCanAdd`). UI gating
  (`RequireFeature` in a segment layout, `FeatureGate`, `AddResourceButton`, `LimitBanner`) is
  for UX only and never replaces the server check.
- Downgrades keep existing data; they only block adding more.
- Demo plan lives in the `spa-plan` cookie (default `executive`), switched via `PUT /api/plan`
  from Settings > Plan & Billing.

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

- No auth or route protection; `getRequestContext()` returns a fixed demo admin.
- The in-memory store resets on restart and is per server instance.
- Notifications (confirmation emails, sales lead alerts) only log to the console.
- Mock helpers fall back to hardcoded demo numbers when "today" has no data (disabled by
  `NEXT_PUBLIC_DEMO_EMPTY=true`).
- No database seed script or migrations committed yet.
