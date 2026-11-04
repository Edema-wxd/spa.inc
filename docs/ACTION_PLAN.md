# Spa.Inc action plan

The product review found that Spa.Inc was a tidy reporting panel without the thing spas actually
buy: a calendar that fills chairs, cuts no-shows and gets paid. This plan turns that review into
work, in order. Each item lists the action steps, the files involved and how we know it is done.

| # | Item | Status |
|---|------|--------|
| 1 | Calendar and booking | **Done** (follow-ups listed) |
| 2 | Public booking page with deposits and WhatsApp reminders | **Done** (needs provider keys to go live) |
| 3 | Real sign-up and onboarding | Not started |
| 4 | Pricing and currency rework | Not started |
| 5 | Honest demo on real services | **Done** (follow-ups listed) |
| 6 | Trust and correctness fixes | Partly done (booking and payment paths) |
| 7 | Reports owners pay more for | Not started |

Order matters: 1 and 5 make the demo sellable, 2 and 3 make the product sell itself, 4 makes the
price match the value, 6 makes it safe to run a real business on, 7 is the upsell.

---

## 1. Calendar and booking (done)

**Why:** a spa owner opens the calendar a hundred times a day. Without it there is no product.

**What shipped**

- `/dashboard/calendar`, first item under Management in the sidebar, available on every plan.
  - Day view: one column per therapist working that day, their hours shaded, a live "now" line,
    and a summary of bookings, booked value and percent of therapist hours booked.
  - Week view: one therapist across Monday to Sunday (`?view=week&staff=<id>`).
  - Click an empty slot to book it. Click a booking to open its details.
  - Cancelled bookings are hidden by default, with a toggle to show them.
- Booking dialog (`src/components/calendar/booking-dialog.tsx`): searchable client picker,
  service, therapist, date, and only the start times that are actually free
  (`GET /api/availability`). Admins can override working hours on purpose. Mobile visits need an
  address.
- Appointment sheet (`src/components/calendar/appointment-sheet.tsx`): check out and take payment
  (opens Record Payment prefilled from the appointment), reschedule, cancel, mark no-show,
  restore a cancellation, book again.
- Book from the client profile (`Book appointment` button) and from anywhere via the header
  `New booking` button (`/dashboard/calendar?book=1&client=<id>`).
- Server rules in `src/server/services/appointments.ts`, enforced on create and update:
  - no overlap with the therapist's other live bookings (409 `BOOKING_CONFLICT`)
  - no overlap with the client's other live bookings (409 `BOOKING_CONFLICT`)
  - inside the therapist's working hours for that weekday, start and end (422
    `OUTSIDE_WORKING_HOURS`), unless an admin sets `allow_outside_hours`
  - only active staff can be booked; staff members can only book or move their own bookings
  - duration defaults to the service; an appointment can't be completed before it starts;
    restoring a cancelled booking re-checks for clashes
- Everything is computed in the location's timezone (`src/lib/time.ts`), so 7 PM in Austin is
  7 PM for every viewer.

**Verified:** 32 scripted API checks (double booking, partial overlap, client clash, day off,
end of shift, inactive therapist, reschedule onto a booked slot, cancel frees the slot, and so on)
and a browser run that books through the dialog and opens the sheet. No console errors.

**Follow-ups**

1. Drag to reschedule and drag to resize in the day view.
2. Buffer time per service (cleanup between sessions) used by availability.
3. Split shifts and breaks: `staff_schedules` allows one row per weekday. Allow several rows per
   day, and add time-off entries (vacation, sick) that block availability.
4. A schedule editor on the staff profile (the API `PUT /api/staff/[id]/schedule` exists).
5. Recurring bookings ("every 2 weeks for 3 months").
6. Rooms and equipment as bookable resources (couples rooms, hot stone setup).
7. Database-level protection against two simultaneous bookings for the same slot: wrap the check
   and insert in a transaction with a Postgres exclusion constraint on
   `(staff_id, tstzrange(scheduled_at, scheduled_at + duration))` for live statuses.

---

## 2. Public booking page with deposits and WhatsApp reminders (done)

**Why:** this is the hook. "No-shows cost you ₦X a month, here is ₦Y back." Every client who
books sees the spa's page and our brand, which is the growth loop. Made core, not an add-on.

**What shipped** (setup guide: [`docs/ONLINE_BOOKING.md`](ONLINE_BOOKING.md))

- `/book/[slug]`: mobile-first booking flow. Treatment, then therapist ("First available" merges
  everyone's free times and assigns the therapist with the most room that day), then a day strip
  showing only days with space, then times, then name, WhatsApp number, optional email and notes,
  with the cancellation policy to accept. "Booking by Spa.Inc" footer links back to pricing.
- Public API under `/api/public/[slug]/`: `days`, `availability`, `bookings`, and per booking
  `cancel`, `demo-pay` and `ics` (add to calendar). Rate limited per IP and per phone, honeypot
  field, minimum notice and booking window enforced, slot re-checked under a per-business lock.
  Returning clients are matched by phone number in any format.
- Deposits: one rule per business (none, fixed amount or percent of the price). Bookings with a
  deposit are `PENDING_DEPOSIT` and hold the slot for `hold_minutes` (30 by default); unpaid
  holds are released automatically. Paid deposits become a Payment and come off the bill at
  check-out. Cancelling at least `cancellation_notice_hours` ahead refunds the deposit through the
  provider; later cancellations and no-shows keep it. Staff can choose "refund" or "keep" when
  they cancel, confirm a pending booking without a deposit, or release the slot.
- Providers: Paystack for NGN, Stripe Checkout for USD (no SDK, plain HTTPS), and a labelled demo
  checkout when no keys are set. Payment is only confirmed by a signature-checked webhook or a
  server-side verification call, never by the return URL alone.
- WhatsApp Cloud API: approved templates for confirmation, deposit request, reminder and
  cancellation; inbound webhook handles "1" (confirms) and "2" (sends the manage link). Without
  credentials, messages are recorded as SIMULATED in the message log, never silently dropped.
- Reminders: hourly job (`vercel.json` -> `GET /api/cron/reminders`, `CRON_SECRET`), also
  runnable from the dashboard. Each booking is reminded once.
- `/book/[slug]/booking/[token]`: the client's manage page (pay deposit with countdown, add to
  calendar, cancel with the policy spelled out).
- Dashboard: `/dashboard/online-booking` with the share link, WhatsApp share and website
  button snippet; stats (share booked online, no-show rate with vs without deposit, deposits
  kept, share confirmed on WhatsApp); provider status; booking rules form; message log.
  The calendar shows online bookings, pending deposits (dashed amber) and confirmations.
- Plans: online booking on every plan; deposits and WhatsApp messages from Manager up. The
  WhatsApp, online booking and Paystack add-ons were removed from the pricing page because they
  are now included.
- Demo data: online booking "launched" 120 days ago in the seed. In the last 90 days online
  bookings with a deposit no-show about 1.4% of the time vs about 3.4% without.

**Verified:** 54 scripted checks against the running app (holds, double booking, demo payment,
spoofed return URLs, early and late cancellation, phone matching, honeypot, policy, booking
window, IP rate limit, calendar file, Stripe and Paystack signatures and replay window, WhatsApp
handshake, signature and "1" reply, admin settings and plan gating, reminder idempotency, cron
auth, pending holds blocking dashboard bookings) plus a phone-sized browser run of the whole flow.
The original 32 booking checks still pass.

**Follow-ups**

1. Real-world test with Paystack and Stripe test keys and a WhatsApp test number; the adapters
   follow the providers' documented APIs but have only run against mocks here.
2. Per-business WhatsApp numbers (today one platform number; replies are matched by phone).
3. SMS fallback (Termii in Nigeria, Twilio elsewhere) and email confirmations (Resend).
4. Per-service deposits and deposit-free services; packages and gift cards.
5. Client self-reschedule on the manage page (today: cancel and book again).
6. Shared rate-limit store and the Postgres exclusion constraint for multi-instance deployments.
7. Show prices in the business currency across the dashboard (item 4).

---

## 3. Real sign-up and onboarding

**Why:** today every pricing button goes to a login form that only logs to the console.
Nobody can become a customer without talking to us.

**Action steps**

1. Supabase Auth (email magic link and phone OTP). Replace `getRequestContext()` in
   `src/server/context.ts` with the session: load the user, their organization and the
   subscription. Add `middleware.ts` to protect `/dashboard/*` and redirect staff away from
   admin pages.
2. `/signup`: business name, owner name, phone, country (sets currency and timezone). Creates the
   organization, location, owner user and a trial subscription in one transaction.
3. Onboarding checklist on the dashboard until complete: add services (with a starter menu to
   pick from), add therapists and their hours, share the booking link, make a first booking.
   Target: first booking in under 10 minutes.
4. Import clients from CSV or a phone's contacts export.
5. Reverse trial: 14 days of the full product (Executive features), then drop to the chosen plan.
   Trial users should see the analytics and P&L we sell, not the smallest plan.
6. Wire the pricing page buttons to `/signup?plan=<tier>`.
7. Move the demo to `/demo` with a "Start free" banner, so prospects can try it without signing up.

**Done when:** a stranger can go from the pricing page to a working calendar without help, and
`DATA_SOURCE=prisma` runs with real sessions.

---

## 4. Pricing and currency rework

**Why:** client caps punish the best customers (a busy single-location spa passes 500 clients in
months and then has no self-serve plan), seats are counted for admins instead of therapists, and
a Nigerian spa billed in naira sees its own takings in dollars.

**Action steps**

1. Store the business currency on `organizations` (from the sign-up country). Replace
   `formatCurrency(cents)` in `src/lib/utils.ts` with `formatMoney(amountMinor, currency)` and
   pass the currency from the request context. Money stays integer minor units (kobo, cents).
2. Change limits in `src/lib/plans.ts`: unlimited clients on every plan; limit by bookable
   therapists (for example 1 / 5 / 12 / unlimited) and by locations.
3. Price per bookable therapist above an included number, so the bill grows with the spa, not
   with its client list.
4. Make online booking, reminders and deposits part of Manager and up instead of add-ons; keep
   add-ons for genuinely optional modules (loyalty, PDF reports).
5. Fix naira add-on prices so they follow the same exchange ratio as the plans, and only offer
   Paystack where Paystack works.
6. Let the owner be bookable on the solo plan (today Essentials can't book anyone, because
   staff management is a Manager feature and only staff can be booked).
7. Billing: Paystack subscriptions for NGN, Stripe for USD, webhooks update `subscriptions`;
   remove the plan cookie (`PUT /api/plan`) outside demo mode.

**Done when:** a 7-therapist spa with 2,000 clients has a self-serve plan, sees naira if it is in
Nigeria, and upgrades without contacting sales.

---

## 5. Honest demo on real services (done)

**Why:** the old demo showed Today's Revenue ($2,847) higher than Monthly Revenue ($480),
hardcoded "+12.5%" growth figures, a fake notification count, and a spa losing money. New data
never appeared because pages read static mock files. All of the mock data, including gated
expense data, shipped in the public JavaScript.

**What shipped**

- `src/lib/mock-data/` is gone. `src/server/demo/seed.ts` (server-only) simulates a
  seven-therapist day spa in Austin over 12 months, day by day from each therapist's real working
  hours: about 9,000 bookings, 490 clients with realistic loyalty and lapse patterns, payments
  per completed visit, no-show fees, 45% therapist commission paid twice a month, rent,
  utilities, card fees, supplies and equipment. Revenue grows from about $51k to $68k a month at
  a 15 to 25% margin. Output is deterministic for a given day.
- Every dashboard page now reads services, which read repositories: dashboard, calendar, clients
  and profiles, staff and profiles, payments, expenses, analytics overview, revenue, performance,
  P&L, settings. New services: `business.ts` (timezone clock, lookups), `dashboard.ts`, plus
  profile and row builders in `clients.ts`, `users.ts`, `payments.ts`, `expenses.ts`,
  `analytics.ts`.
- No invented numbers: comparisons are computed (month to date vs the same weekdays four weeks
  earlier), the current month is labelled "MTD" on P&L, P&L headline numbers cover complete
  months only, ratings show "No ratings" instead of a made-up 4.5.
- Paywall no longer leaks: expense data and revenue breakdowns are only computed and sent when
  the plan includes them; no seed data is in the client bundle.
- The header shows the signed-in user instead of a hardcoded name; the fake bell is replaced by
  a `New booking` button; the header search box now searches clients.
- Revenue and performance pages have a period switcher (`?range=30d|90d|12m`).
- Record Payment takes dollars instead of cents, and can be prefilled from an appointment.
- Dates are formatted in the business timezone; date-only values no longer shift a day for
  viewers west of UTC.
- Summary cards fit two per row on a phone.

**Follow-ups**

1. Seed script for Postgres (`prisma/seed.ts`) that loads `buildDemoData()` so
   `DATA_SOURCE=prisma` has the same demo; the seed ids need mapping to UUIDs.
2. Move analytics aggregation into SQL for the Prisma repository (group by date, staff, service)
   instead of loading rows into memory.
3. Store the price paid on the appointment (today calendar values use the service's current
   price).
4. A "Reset demo" button and a guided tour for prospects.

---

## 6. Trust and correctness fixes

**Done in this pass**

- Payment and expense dates must be real dates (a bad date used to break P&L for everyone).
- Payments linked to an appointment must reference an appointment in the same organization that
  belongs to the same client. Staff can only record their own payments.
- Appointments can't be moved to a therapist that doesn't exist or is inactive.
- Schedules reject end times before start times and duplicate days.
- Client email is optional (phone-first markets).

**Action steps remaining**

1. Deleting a client must not delete revenue history. Change `onDelete: Cascade` on
   `Payment.client` and `Appointment.client` to `Restrict`, add `archived_at` to clients and make
   delete an archive.
2. Role scoping for staff: staff see only their own clients, appointments and earnings
   (`listClients`, `getClient`, analytics). Add tests per role.
3. Refunds and edits: `PUT /api/payments/[id]` for status changes (refund, mark paid) with an
   audit trail.
4. Rate limit and spam-protect `POST /api/sales-leads` (IP limit plus honeypot or Turnstile).
5. Real subscription check instead of the `spa-plan` cookie (see item 4).
6. Recurring expenses should create their next occurrence (scheduled job), or the flag should be
   removed.
7. Tests: unit tests for `src/lib/time.ts`, the clash rules and plan limits; API tests like the
   booking checks above in CI; a Playwright smoke test of the booking flow.
8. Audit log table for bookings, payments and deletes.

---

## 7. Reports owners pay more for

**Action steps**

1. Commission and payroll report: per therapist per pay period, revenue, commission rate,
   tips, payout; export to CSV. Needs `commission_rate` on users and `tip_amount` on payments.
2. Rebooking rate: share of clients who book their next visit before leaving, per therapist and
   overall. Prompt to rebook in the check-out flow.
3. Client retention: new vs returning per month, lapsed clients (no visit in 90 days) with a
   one-click win-back message (uses item 2's WhatsApp channel).
4. Utilization by therapist and hour of day, to set schedules and prices for peak hours.
5. CSV and PDF export for P&L and payments (also listed in the original spec).

**Done when:** an owner can run payroll and a win-back campaign from Spa.Inc without a
spreadsheet.
