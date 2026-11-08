# Sign-up and sign-in

Owners sign in with a 6-digit code sent to their email. There are no passwords.

## How it works

1. **Sign-up** (`/signup`, `POST /api/auth/signup`): checks the details, rejects an email that
   already has an account, keeps the details in a signed `spa-signup` cookie for 30 minutes and
   emails a code. Nothing is created yet.
2. **Verify** (`POST /api/auth/verify`): checks the code. If the browser has a pending sign-up for
   that email, the business is created in one step (organization, location, owner, booking
   settings and a `TRIALING` subscription) and the owner lands on `/dashboard/welcome`.
   Otherwise it signs in to the existing account. Staff land on the calendar.
3. **Sign-in** (`/login`, `POST /api/auth/login`): emails a code to an existing account.
4. **Session**: Supabase's own cookies, or a signed `spa-session` cookie (30 days) in demo mode.
   `src/proxy.ts` sends visitors without a session from `/dashboard/*` to `/login?next=...`;
   every service call still re-checks the session through `getRequestContext()`.
5. **Accounts**: the Supabase user id is stored on `users.auth_user_id`. A team member added by
   an owner is linked by email the first time they sign in.

Requests for codes are rate limited per IP (20 per 10 minutes) and per email (5 per 10 minutes).

## Modes

| Mode | When | Codes |
|------|------|-------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set | Emailed by Supabase Auth |
| Demo | No Supabase keys and the memory store (or `ALLOW_DEMO=true`) | Shown on screen, nothing is sent |
| Off | No Supabase keys with `DATA_SOURCE=prisma` | Sign-in returns 503 until configured |

`/demo` signs a visitor into the sample business without an account. It is available only when
demo mode is allowed (the memory store, or `ALLOW_DEMO=true`). Link to it with a plain `<a>`,
never `next/link`: prefetching it would sign visitors into the demo without a click.

## Setting up Supabase Auth

1. In the Supabase project, Authentication > Providers: enable **Email**.
2. Authentication > Email Templates > **Magic Link**: include the code, for example
   `Your Spa.Inc code is {{ .Token }}`. You can keep the link too (`{{ .ConfirmationURL }}`);
   it lands on `/auth/callback`, which finishes sign-in or sign-up in the same browser.
3. Authentication > URL Configuration: set the Site URL to `APP_URL` and add
   `<APP_URL>/auth/callback` to the redirect URLs.
4. Set up a custom SMTP sender (Resend, Postmark, SES) before launch; Supabase's built-in
   sender is heavily rate limited.
5. Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL` and
   `AUTH_SECRET` (32+ random characters, for example `openssl rand -hex 32`).

## Trials and plans

- Every new business gets 14 days of everything (Executive features), then continues on the plan
  chosen at sign-up, which the owner can change in Settings > Plan & Billing.
- During the trial `ctx.plan` is `executive`; afterwards it is `subscriptions.plan`. Limits and
  features follow `src/lib/plans.ts` as before. Downgrades keep data and only block adding more.
- Billing is not wired up yet (action plan item 4): when a trial ends the business simply moves
  to its chosen plan.
