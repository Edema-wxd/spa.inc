import "server-only"

import type { BusinessCurrency, DepositProviderId } from "@/types"
import { paystackProvider } from "./paystack"
import { stripeProvider } from "./stripe"
import type { DepositProvider } from "./types"

/**
 * Demo provider: the "checkout" is a page in this app with a Pay button and
 * no money moves. It is used only when no real provider is configured, and
 * never on a real database unless ALLOW_DEMO_PAYMENTS=true.
 */
export const demoProvider: DepositProvider = {
  id: "DEMO",
  async createCheckout(request) {
    return { checkoutUrl: request.cancelUrl.replace(/\/?$/, "/pay"), reference: `demo_${request.depositId}` }
  },
  async verify() {
    // Demo payments are confirmed by the in-app Pay button, not by verification
    return { paid: false, amount: 0, currency: "" }
  },
  async refund() {},
}

function demoAllowed() {
  return process.env.DATA_SOURCE !== "prisma" || process.env.ALLOW_DEMO_PAYMENTS === "true"
}

/** Paystack for naira, Stripe for dollars; the demo provider when neither is configured. */
export function getDepositProvider(currency: BusinessCurrency): DepositProvider | null {
  if (currency === "NGN" && process.env.PAYSTACK_SECRET_KEY) return paystackProvider
  if (currency === "USD" && process.env.STRIPE_SECRET_KEY) return stripeProvider
  return demoAllowed() ? demoProvider : null
}

export function getProviderById(id: DepositProviderId): DepositProvider {
  return id === "PAYSTACK" ? paystackProvider : id === "STRIPE" ? stripeProvider : demoProvider
}

export function describeProvider(currency: BusinessCurrency) {
  const provider = getDepositProvider(currency)
  if (!provider) return { id: null, label: "Not configured", live: false }
  return {
    id: provider.id,
    label: provider.id === "PAYSTACK" ? "Paystack" : provider.id === "STRIPE" ? "Stripe" : "Demo checkout (no money moves)",
    live: provider.id !== "DEMO",
  }
}

export { ProviderError } from "./types"
