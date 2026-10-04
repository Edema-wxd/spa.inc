# Spa.Inc

A management dashboard for spas and massage businesses: client records, therapist schedules,
payments, revenue analytics, expenses and profit & loss, plus a public pricing page and a sales
enquiry form.

The app currently runs as a **demo**: it ships with seeded sample data and needs no database or
login to try. The backend is structured so that switching to a real PostgreSQL database is a
configuration change (see [Backend](#backend)).

## Quick start

```bash
npm install        # also generates the Prisma client
npm run dev        # http://localhost:3000
```

| Page | What's there |
|------|--------------|
| `/` | Landing page |
| `/pricing` | Plans, comparison table, add-ons |
| `/contact-sales` | Enterprise / custom quote form |
| `/dashboard` | The admin dashboard (no login needed in the demo) |
| `/dashboard/settings?tab=plan` | Switch the demo between plans to see limits and locked features |

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `npm run db:validate` | Validate `prisma/schema.prisma` |
| `npm run db:migrate` | Create and apply a migration (needs `DIRECT_URL`) |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:studio` | Browse the database |

### Environment

Copy `.env.example` to `.env.local`. Every variable is optional for the demo.

| Variable | Purpose |
|----------|---------|
| `DATA_SOURCE` | `memory` (default, seeded demo data) or `prisma` (PostgreSQL) |
| `DATABASE_URL` | Pooled Postgres connection used by the app |
| `DIRECT_URL` | Direct Postgres connection used by migrations |
| `NEXT_PUBLIC_DEMO_EMPTY` | `true` starts with no data, to preview every empty state |
| `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | Reserved for Supabase Auth (not wired up yet) |

## Plans and pricing

Plans are defined once in `src/lib/plans.ts` (limits and features) and `src/lib/pricing.ts`
(prices and marketing copy). The pricing page, the dashboard locks and the API all read from
these files, so they can't drift apart.

| Plan | For | USD / mo | NGN / mo | Admins | Clients | Locations |
|------|-----|---------:|---------:|-------:|--------:|----------:|
| Essentials | Single users (14-day free trial) | $19 | ₦15,000 | 1 | 50 | 1 |
| Manager (Most Popular) | Small stores, one office | $49 | ₦35,000 | 3 | 200 | 1 |
| Executive | Established single-office stores | $99 | ₦75,000 | Unlimited | 500 | 1 |
| Enterprise | Stores with multiple locations | Custom | Custom | Unlimited | Unlimited | Unlimited |

Features by plan:

- **Essentials:** clients, appointments, payments, dashboard overview
- **Manager:** + staff directory & schedules, revenue analytics, expense tracking
- **Executive:** + performance leaderboard, profit & loss reports, email confirmations
- **Enterprise:** + multi-location, consolidated reporting, guided onboarding

Annual billing is 10% off. Add-ons (WhatsApp notifications, online booking, Paystack, smart
scheduling, loyalty, PDF reports) are listed as "coming soon".

**Currency.** Prices are shown in USD everywhere except Nigeria, which sees NGN. The country
comes from the host's geo header (`x-vercel-ip-country` on Vercel, `cf-ipcountry` on
Cloudflare). Visitors can switch with `?region=ng` or `?region=intl`.

> Plan prices are placeholders until the business signs them off.

### How limits are enforced

- **API:** services check the plan before acting and respond with `403` and
  `PLAN_LIMIT_REACHED` or `PLAN_FEATURE_UNAVAILABLE` (see `src/server/entitlements.ts`).
- **Pages:** gated sections (Staff, Revenue, Performance, Expenses, P&L) render an upgrade prompt
  instead of their content, using route layouts.
- **UI:** the sidebar shows locks, "Add" buttons disable at the limit, usage meters and banners
  explain why, and Settings > Plan & Billing shows usage for each plan.
- **Downgrades** never delete data. If an organization is over a limit, existing records stay
  but nothing new can be added.

In the demo the current plan is stored in a cookie (default: Executive). With billing it will
come from the `subscriptions` table.

## Backend

```
prisma/schema.prisma        PostgreSQL schema (multi-tenant)
src/app/api/**/route.ts     HTTP layer: parse + validate input, call a service, return JSON
src/server/
  context.ts                who is calling: organization, user, role, plan
  entitlements.ts           assertFeature / assertCanAdd / assertRole
  errors.ts, http.ts        error types and the response envelope
  services/                 business rules (one file per domain)
  repositories/
    types.ts                data access interfaces
    memory.ts               in-memory store seeded from src/lib/mock-data (default)
    prisma.ts               Prisma implementation (DATA_SOURCE=prisma)
src/lib/validation/         zod schemas shared by forms and API routes
```

Requests flow **route → service → repository**. Routes stay thin, services hold the rules (plan
limits, role checks, side effects like confirmation emails) and repositories are the only code
that touches storage.

Every response uses the same shape:

```json
{ "data": { }, "error": null, "message": "OK" }
{ "data": null, "error": "PLAN_LIMIT_REACHED", "message": "Your plan allows up to 50 clients...", "details": { } }
```

### API routes

| Method | Route | Notes |
|--------|-------|-------|
| GET, POST | `/api/clients` | `?search=`; POST checks the client limit |
| GET, PUT, DELETE | `/api/clients/[id]` | |
| GET | `/api/clients/[id]/history` | Appointments and payments |
| GET, POST | `/api/staff` | Manager+ |
| GET, PUT | `/api/staff/[id]` | Manager+ |
| GET, PUT | `/api/staff/[id]/schedule` | Manager+ |
| GET, POST | `/api/appointments` | POST emails a confirmation on Executive+ |
| PUT | `/api/appointments/[id]` | |
| GET, POST | `/api/payments` | |
| GET | `/api/payments/summary` | `?period=daily\|weekly\|monthly&from=&to=` |
| GET, POST | `/api/expenses` | Admin, Manager+ |
| PUT, DELETE | `/api/expenses/[id]` | Admin, Manager+ |
| GET | `/api/expenses/summary` | Admin, Manager+ |
| GET | `/api/analytics/revenue` | Manager+ |
| GET | `/api/analytics/leaderboard` | Executive+ |
| GET | `/api/analytics/pnl` | `?months=6`, Executive+ |
| GET, POST | `/api/users` | Team; POST checks the admin seat limit |
| GET, POST | `/api/locations` | POST checks the location limit (Enterprise for more than 1) |
| GET, PUT | `/api/plan` | Plan and usage; PUT switches plan (demo only) |
| POST | `/api/sales-leads` | Public, from `/contact-sales` |

### Connecting a database

1. Create a Supabase project and put its connection strings in `.env.local`
   (`DATABASE_URL`, `DIRECT_URL`).
2. `npm run db:migrate -- --name init`
3. Set `DATA_SOURCE=prisma` and restart.

### Roadmap

- [ ] Supabase Auth: replace the demo user in `src/server/context.ts` with the session, and add
      route protection for `/dashboard`
- [ ] Load each organization's plan from `subscriptions` instead of the demo cookie
- [ ] Billing checkout and webhooks (Paystack for NGN, a USD provider for everyone else)
- [ ] Move the remaining dashboard pages from `src/lib/mock-data` to services (the clients list
      and Add Client flow already use them; other pages still read mock data directly)
- [ ] Seed script for the database
- [ ] Email provider for confirmations and sales lead alerts (currently logged)
- [ ] CSV / PDF export

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui on Radix, Recharts,
TanStack Table, react-hook-form + zod, Prisma 7 + PostgreSQL (Supabase), date-fns.

The original product spec is in `raw.txt`. Notes for AI-assisted development are in
`CLAUDE.md`.
