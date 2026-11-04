import { NextResponse } from "next/server"
import { verifyPaystackSignature } from "@/server/payments/paystack"
import { handleProviderPayment } from "@/server/services/deposits"

/**
 * Paystack webhook (set the URL in Paystack Dashboard > Settings > API Keys & Webhooks).
 * Verifies x-paystack-signature, then confirms the deposit for `charge.success`.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }
  const event = JSON.parse(raw) as { event?: string; data?: { reference?: string; status?: string } }
  if (event.event === "charge.success" && event.data?.reference && event.data.status === "success") {
    const outcome = await handleProviderPayment(event.data.reference)
    return NextResponse.json({ received: true, outcome })
  }
  // Acknowledge everything else so Paystack doesn't retry
  return NextResponse.json({ received: true })
}
