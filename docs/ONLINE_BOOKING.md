# Online booking, deposits and WhatsApp reminders

Every business gets a public booking page at `/book/<slug>` (the demo is
`/book/juniper-day-spa`). Clients pick a treatment, a therapist or "First available", and a
time, then leave their name and WhatsApp number. If the business takes deposits, the slot is held
while the client pays, and the booking is confirmed when the payment arrives. A WhatsApp
confirmation goes out straight away and a reminder the day before; clients reply 1 to confirm or
2 to change.

Out of the box everything runs in **demo mode**: deposits use an in-app "Demo checkout" (no
money moves) and WhatsApp messages are written to the message log instead of being sent. Add the
keys below to go live.

## How it works

```
client books ──> appointment PENDING_DEPOSIT (slot held for hold_minutes)
                 deposit PENDING ──> provider checkout (Paystack / Stripe / demo)
                                       │
          webhook or return redirect ──┘──> deposit PAID, Payment row, appointment SCHEDULED
                                             WhatsApp confirmation
hold expires unpaid ──> appointment CANCELLED, deposit EXPIRED (slot free again)
day before ──> WhatsApp reminder ──> reply "1" sets confirmed_at, "2" sends the manage link
cancel ≥ notice hours ──> deposit refunded      cancel later / no-show ──> deposit kept
```

| Piece | Where |
|-------|-------|
| Public pages | `src/app/book/[slug]/...` (booking flow, manage page, demo checkout) |
| Public API | `src/app/api/public/[slug]/...` (days, availability, bookings, cancel, demo-pay, ics) |
| Rules | `src/server/services/online-booking.ts`, `scheduling.ts` (availability, clashes), `deposits.ts` |
| Payments | `src/server/payments/` (Paystack, Stripe Checkout, demo) |
| WhatsApp | `src/server/messaging/whatsapp.ts`, `src/server/services/messaging.ts`, `message-templates.ts` |
| Reminders | `src/server/services/reminders.ts`, `GET /api/cron/reminders`, `vercel.json` |
| Dashboard | `/dashboard/online-booking` (link, stats, rules, message log) |

Plans: the booking page is on every plan. Deposits and WhatsApp messages start at Manager
(`src/lib/plans.ts`).

Safety:

- Payment is only ever confirmed by the provider: the webhook (signature checked) or a server-side
  verification call on the return redirect. Query parameters on the return URL are never trusted.
- Webhook signatures: Paystack `x-paystack-signature` (HMAC SHA-512), Stripe `Stripe-Signature`
  (HMAC SHA-256, 5-minute replay window), WhatsApp `X-Hub-Signature-256`.
- Booking is serialized per business while the slot is re-checked and inserted, rate limited per
  IP and per phone number, and has a honeypot field for bots.
- Clients reach their own booking only through a random 24-character manage token.

## Going live

### 1. App URL

Set `APP_URL` (for example `https://app.spa-inc.com`). It is used in WhatsApp links and payment
redirects. Without it the URL comes from the request's host headers.

### 2. Deposits in naira: Paystack

1. Paystack Dashboard > Settings > API Keys & Webhooks: copy the **secret key** into
   `PAYSTACK_SECRET_KEY`.
2. Set the webhook URL to `https://<APP_URL>/api/webhooks/paystack`.
3. Businesses whose currency is NGN now get Paystack checkouts. Paystack needs an email for every
   payment; clients who book with a phone number only get a placeholder address based on their
   number.

### 3. Deposits in dollars: Stripe

1. Stripe Dashboard > Developers > API keys: put the secret key in `STRIPE_SECRET_KEY`.
2. Developers > Webhooks > Add endpoint: `https://<APP_URL>/api/webhooks/stripe`, events
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put the signing
   secret in `STRIPE_WEBHOOK_SECRET`.
3. Stripe Checkout sessions must stay open at least 30 minutes, so `hold_minutes` is at least 30.

With a real database (`DATA_SOURCE=prisma`) and no provider key, deposits are switched off rather
than faked, unless you set `ALLOW_DEMO_PAYMENTS=true` for a staging environment.

### 4. WhatsApp (Cloud API)

1. In Meta Business Manager create a WhatsApp Business app and a phone number. Put the permanent
   access token in `WHATSAPP_ACCESS_TOKEN` and the phone number id in `WHATSAPP_PHONE_NUMBER_ID`.
2. Webhook (App Dashboard > WhatsApp > Configuration): callback
   `https://<APP_URL>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to
   `messages`. Put the app secret in `WHATSAPP_APP_SECRET`.
3. Create and get approval for these templates (language `en`, or set
   `WHATSAPP_TEMPLATE_LANGUAGE`). Rename any of them with `WHATSAPP_TEMPLATE_<KIND>`.

| Template | Env override | Body |
|----------|--------------|------|
| `booking_confirmation` | `WHATSAPP_TEMPLATE_BOOKING_CONFIRMATION` | Hi {{1}}, you're booked at {{2}}: {{3}} with {{4}}, {{5}} at {{6}}. Reply 1 to confirm or 2 to change it. Manage your booking: {{7}} |
| `deposit_request` | `WHATSAPP_TEMPLATE_DEPOSIT_REQUEST` | Hi {{1}}, we're holding {{2}} on {{3}} at {{4}} for you. Pay your {{5}} deposit within {{6}} minutes to confirm: {{7}} |
| `appointment_reminder` | `WHATSAPP_TEMPLATE_REMINDER` | Hi {{1}}, a reminder from {{2}}: {{3}} with {{4}} {{5}} at {{6}}. Reply 1 to confirm or 2 to change it. {{7}} |
| `booking_cancelled` | `WHATSAPP_TEMPLATE_CANCELLATION` | Hi {{1}}, your {{2}} on {{3}} at {{4}} at {{5}} is cancelled. {{6}} |

Replies to clients ("Thanks, you're confirmed") are free-form text, which WhatsApp allows within
24 hours of the client's own message. The wording lives in
`src/server/services/message-templates.ts`.

Phone numbers are stored as digits and converted to international format using the business's
country (`0803...` in Nigeria becomes `234803...`).

### 5. Reminders job

`vercel.json` runs `GET /api/cron/reminders` every hour. Set `CRON_SECRET`; Vercel sends it as
`Authorization: Bearer <CRON_SECRET>`. Hourly crons need a Vercel Pro plan; on Hobby, use a daily
schedule or an external scheduler calling the same URL with the header. The job also releases
unpaid holds. Admins can run it from the dashboard with "Send due reminders now".

## Known limits

- Rate limits and the booking lock live in process memory. With several server instances, move
  rate limits to a shared store (Upstash Redis or Postgres) and add the Postgres exclusion
  constraint described in `docs/ACTION_PLAN.md` (item 1 follow-ups).
- One WhatsApp number for the platform; replies are matched to the business by the last message
  sent to that phone. Per-business numbers are a follow-up.
- No SMS or email fallback yet when a client isn't on WhatsApp.
- Deposits are one rule per business (fixed amount or percent); per-service deposits are a
  follow-up.
- Online bookings are never refused for the plan's client limit (see `docs/ACTION_PLAN.md`
  item 4).
- Clients can cancel online but not reschedule; the manage page links to a new booking instead.
