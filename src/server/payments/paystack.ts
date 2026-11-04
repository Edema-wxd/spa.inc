import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { ProviderError, type CheckoutRequest, type DepositProvider } from "./types"

// Paystack (NGN). Docs: https://paystack.com/docs/api/transaction/
// Env: PAYSTACK_SECRET_KEY. Webhook: POST /api/webhooks/paystack

const API = "https://api.paystack.co"

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new ProviderError("PAYSTACK", "PAYSTACK_SECRET_KEY is not set")
  return key
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init.headers },
  })
  const json = (await response.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null
  if (!response.ok || !json?.status) {
    throw new ProviderError("PAYSTACK", json?.message ?? `HTTP ${response.status}`)
  }
  return json.data as T
}

/**
 * Paystack requires an email for every transaction. Clients who book by
 * phone get a stable placeholder address built from their number.
 */
function emailFor(request: CheckoutRequest) {
  return request.customerEmail || `${request.customerPhone.replace(/\D/g, "")}@clients.spa-inc.invalid`
}

export const paystackProvider: DepositProvider = {
  id: "PAYSTACK",

  async createCheckout(request) {
    const reference = `spa_${request.depositId}`
    const data = await call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: emailFor(request),
        amount: request.amount, // kobo
        currency: request.currency,
        reference,
        callback_url: request.returnUrl,
        metadata: { deposit_id: request.depositId, description: request.description, cancel_action: request.cancelUrl },
      }),
    })
    return { checkoutUrl: data.authorization_url, reference: data.reference }
  },

  async verify(reference) {
    const data = await call<{ status: string; amount: number; currency: string }>(
      `/transaction/verify/${encodeURIComponent(reference)}`
    )
    return { paid: data.status === "success", amount: data.amount, currency: data.currency }
  },

  async refund(reference) {
    await call("/refund", { method: "POST", body: JSON.stringify({ transaction: reference }) })
  },
}

/** Paystack signs webhook bodies with HMAC SHA-512 of the raw body using the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key || !signature) return false
  const expected = createHmac("sha512", key).update(rawBody).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
