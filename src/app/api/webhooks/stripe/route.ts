import { NextResponse } from "next/server"
import { verifyStripeSignature } from "@/server/payments/stripe"
import { handleProviderPayment } from "@/server/services/deposits"

/**
 * Stripe webhook (Dashboard > Developers > Webhooks), events:
 * checkout.session.completed and checkout.session.async_payment_succeeded.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }
  const event = JSON.parse(raw) as {
    type?: string
    data?: { object?: { id?: string; payment_status?: string } }
  }
  const session = event.data?.object
  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    session?.id &&
    session.payment_status === "paid"
  ) {
    const outcome = await handleProviderPayment(session.id)
    return NextResponse.json({ received: true, outcome })
  }
  return NextResponse.json({ received: true })
}
