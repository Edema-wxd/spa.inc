# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Spa.Inc is an admin and staff dashboard for spa / massage businesses: clients, staff schedules,
payments, revenue analytics, expenses and P&L, plus public marketing pages (landing, pricing,
contact sales). The full product spec lives in `raw.txt` (schema, routes, API plan, phases).

**Current state: frontend only.** Every page reads from in-memory mock data in
`src/lib/mock-data/`. There is no backend, database, auth, or middleware yet. Forms
`console.log` their payload and show a `sonner` toast. Supabase + Prisma + API route handlers
are planned (see `raw.txt`) but not installed.

## Commands

```bash
npm run dev     # dev server on :3000
npm run build   # production build (also runs the TypeScript check)
npm run lint    # eslint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit
```

There is no test suite. Validate changes with `npm run lint` and `npm run build`.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config`)
- shadcn/ui ("new-york" style) on the unified `radix-ui` package, components in `src/components/ui/`
- Recharts for charts, TanStack Table for tables
- react-hook-form + zod (import from `zod/v4`) + `@hookform/resolvers`
- date-fns, lucide-react, sonner

## Layout

```
src/app/                    routes (App Router)
  page.tsx                  marketing landing
  pricing/                  public pricing page (tiers, comparison, add-ons)
  contact-sales/            custom quote / sales enquiry form
  login/                    mock auth form
  dashboard/                sidebar shell (layout.tsx) + all admin modules
src/components/
  ui/                       shadcn primitives - avoid hand-editing, regenerate with the shadcn CLI
  shared/                   app-wide building blocks (PageHeader, DataTable, SummaryCard, ...)
  layout/                   sidebar, header, breadcrumbs, nav-items.ts (dashboard nav config)
  marketing/                public-site header
  pricing/                  pricing cards, comparison table, add-ons, contact sales form
  <module>/                 feature components per dashboard module (clients, staff, ...)
  charts/                   Recharts components
src/lib/
  utils.ts                  cn(), formatCurrency(), date/phone helpers
  pricing.ts                SINGLE SOURCE OF TRUTH for plans, features, add-ons, prices
  mock-data/                seeded data + derived metric helpers (index.ts)
  chart-colors.ts           brand chart palette
src/types/index.ts          domain types mirroring the planned DB schema
```

## Conventions

- Default to Server Components. Add `"use client"` only where state, effects, or event handlers
  are needed, and keep client components as small leaf components (see `pricing-cards.tsx`).
- Dynamic route `params` are a `Promise` in Next 16: `const { id } = await params`.
- Client components using `useSearchParams` must be wrapped in `<Suspense>` by their page.
- Use the `@/` path alias. Compose classes with `cn()`.
- Brand colors are Tailwind theme tokens: `spa-primary`, `spa-accent`, `spa-50` ... `spa-900`,
  `spa-surface`. Prefer these over raw hex.
- Dashboard money is stored as integer **cents** and rendered with `formatCurrency()` (USD).
  Pricing is in whole **Naira** and rendered with `formatNaira()` from `src/lib/pricing.ts`.
  Do not mix the two.
- New dashboard pages: add the route under `src/app/dashboard/`, register it in
  `src/components/layout/nav-items.ts`, and start with `<PageHeader />`.
- Forms: zod schema + `zodResolver`, show field errors as `text-xs text-destructive`.
- Do not use em dashes in user-facing copy; use commas or hyphens.

## Pricing

All plan data is in `src/lib/pricing.ts`; the UI derives everything from it.

| Tier | Audience | Monthly | Admins | Clients |
|------|----------|---------|--------|---------|
| Essentials | Single users | ₦15,000 (14-day free trial) | 1 | 50 |
| Manager (Most Popular) | Small stores, one office | ₦35,000 | 3 | 200 |
| Executive | Established single-office stores | ₦75,000 | Unlimited | 500 |
| Enterprise | Multiple locations | Custom quote, via `/contact-sales` | Unlimited | Unlimited |

- Annual billing is `ANNUAL_DISCOUNT` (10%) off. Email confirmations start at Executive.
  Support level is the same on every tier.
- Add-ons (coming soon): WhatsApp ₦15k, online booking ₦25k, Paystack ₦20k, smart scheduling ₦18k,
  loyalty ₦12k, PDF reports ₦10k, multi-location (Enterprise, contact sales).
- `/contact-sales` accepts `?plan=<tierId>` and `?addon=<addOnId>` to prefill the form.
- Essentials / Manager / Executive prices are placeholders pending business sign-off.

## Known gaps

- No auth or role enforcement; `/dashboard` is publicly reachable and `/login` just redirects.
- Plan limits (clients, admin seats, features) are not enforced anywhere in the dashboard yet.
- The contact sales form does not submit anywhere; wire it to an API route / CRM.
- Mock helpers in `src/lib/mock-data/index.ts` fall back to hardcoded demo numbers when the
  data for "today" is empty, so dashboard figures are not always derived from the dataset.
- `README.md` is still the create-next-app boilerplate; `raw.txt` is the real spec.
