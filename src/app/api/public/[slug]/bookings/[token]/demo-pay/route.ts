import { ok, route } from "@/server/http"
import { payDemoDeposit } from "@/server/services/online-booking"

/** Demo checkout only (no payment provider configured): marks the deposit paid. */
export const POST = route<{ slug: string; token: string }>(async (_request, { params }) => {
  const { slug, token } = await params
  const outcome = await payDemoDeposit(slug, token)
  return ok({ outcome }, outcome === "confirmed" ? "Deposit paid, booking confirmed" : "Payment recorded")
})
