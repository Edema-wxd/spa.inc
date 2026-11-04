import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { ProviderError, type DepositProvider } from "./types"

// Stripe Checkout (USD), called over HTTPS without the SDK.
// Docs: https://docs.stripe.com/api/checkout/sessions
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Webhook: POST /api/webhooks/stripe

const API = "https://api.stripe.com/v1"

function secret() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new ProviderError("STRIPE", "STRIPE_SECRET_KEY is not set")
  return key
}

async function call<T>(path: string, form?: Record<string, string>): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: form ? "POST" : "GET",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form ? new URLSearchParams(form) : undefined,
  })
  const json = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null
  if (!response.ok || !json) {
    throw new ProviderError("STRIPE", json?.error?.message ?? `HTTP ${response.status}`)
  }
  return json
}

interface Session {
  id: string
  url: string | null
  payment_status: "paid" | "unpaid" | "no_payment_required"
  amount_total: number | null
  currency: string | null
  payment_intent: string | null
}

export const stripeProvider: DepositProvider = {
  id: "STRIPE",

  async createCheckout(request) {
    // Stripe requires sessions to stay open at least 30 minutes
    const expiresAt = Math.max(request.expiresAt.getTime(), Date.now() + 31 * 60_000)
    const session = await call<Session>("/checkout/sessions", {
      mode: "payment",
      success_url: `${request.returnUrl}${request.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: request.cancelUrl,
      client_reference_id: request.depositId,
      "metadata[deposit_id]": request.depositId,
      expires_at: String(Math.floor(expiresAt / 1000)),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": request.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(request.amount),
      "line_items[0][price_data][product_data][name]": request.description,
      ...(request.customerEmail ? { customer_email: request.customerEmail } : {}),
    })
    if (!session.url) throw new ProviderError("STRIPE", "Checkout session has no URL")
    return { checkoutUrl: session.url, reference: session.id }
  },

  async verify(reference) {
    const session = await call<Session>(`/checkout/sessions/${encodeURIComponent(reference)}`)
    return { paid: session.payment_status === "paid", amount: session.amount_total ?? 0, currency: session.currency ?? "" }
  },

  async refund(reference) {
    const session = await call<Session>(`/checkout/sessions/${encodeURIComponent(reference)}`)
    if (!session.payment_intent) throw new ProviderError("STRIPE", "Session has no payment to refund")
    await call("/refunds", { payment_intent: session.payment_intent })
  },
}

/**
 * Stripe-Signature: "t=<unix>,v1=<hex>[,v1=...]". The signed payload is
 * `${t}.${rawBody}`, HMAC SHA-256 with the endpoint's signing secret.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, toleranceSeconds = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !header) return false
  const parts = header.split(",").map((p) => p.split("=") as [string, string])
  const timestamp = parts.find(([k]) => k === "t")?.[1]
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v)
  if (!timestamp || signatures.length === 0) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) return false
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"))
  return signatures.some((sig) => {
    const given = Buffer.from(sig)
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}
