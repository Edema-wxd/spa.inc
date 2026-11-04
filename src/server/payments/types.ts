import type { BusinessCurrency, DepositProviderId } from "@/types"

export interface CheckoutRequest {
  depositId: string
  /** Minor units */
  amount: number
  currency: BusinessCurrency
  description: string
  customerEmail: string | null
  customerPhone: string
  /** Where the provider sends the client after paying */
  returnUrl: string
  /** Where the provider sends the client if they back out */
  cancelUrl: string
  expiresAt: Date
}

export interface CheckoutResult {
  checkoutUrl: string
  /** Stored on the deposit; webhooks and verification look it up by this */
  reference: string
}

export interface VerifyResult {
  paid: boolean
  amount: number
  currency: string
}

export interface DepositProvider {
  id: DepositProviderId
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
  /** Ask the provider whether a checkout has been paid (used on the return redirect) */
  verify(reference: string): Promise<VerifyResult>
  refund(reference: string): Promise<void>
}

export class ProviderError extends Error {
  constructor(provider: DepositProviderId, message: string) {
    super(`[${provider}] ${message}`)
    this.name = "ProviderError"
  }
}
