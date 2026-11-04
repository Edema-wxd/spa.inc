import "server-only"

import { formatMoney } from "@/lib/booking"
import type { Appointment, Client, Deposit, Organization } from "@/types"
import { getSystemContext, type RequestContext } from "@/server/context"
import { ApiError } from "@/server/errors"
import { getDepositProvider, getProviderById, ProviderError } from "@/server/payments"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock } from "@/server/services/business"
import { sendClientMessage } from "@/server/services/messaging"
import { assertNoConflicts } from "@/server/services/scheduling"

// ---------------------------------------------------------------------------
// Deposits for online bookings
//
// Flow: booking -> PENDING_DEPOSIT appointment + PENDING deposit -> provider
// checkout -> webhook or return redirect -> markDepositPaid -> SCHEDULED.
// Unpaid holds expire (releaseExpiredHolds). When an appointment is
// cancelled or missed, settleDeposit refunds or keeps the money.
// ---------------------------------------------------------------------------

export async function startDepositCheckout(
  ctx: RequestContext,
  input: {
    org: Organization
    appointment: Appointment
    client: Client
    amount: number
    serviceName: string
    manageUrl: string
    expiresAt: Date
  }
): Promise<{ deposit: Deposit; checkoutUrl: string }> {
  const provider = getDepositProvider(input.org.currency)
  if (!provider) throw new ApiError(503, "PAYMENT_PROVIDER_ERROR", "Online payments are not set up for this business yet.")
  const { deposits } = await getRepositories()
  let deposit = await deposits.create(ctx.organizationId, {
    appointment_id: input.appointment.id,
    client_id: input.client.id,
    amount: input.amount,
    currency: input.org.currency,
    provider: provider.id,
    status: "PENDING",
    provider_reference: `pending_${input.appointment.id}`,
    checkout_url: null,
    payment_id: null,
    paid_at: null,
  })
  try {
    const checkout = await provider.createCheckout({
      depositId: deposit.id,
      amount: input.amount,
      currency: input.org.currency,
      description: `Deposit: ${input.serviceName} at ${input.org.name}`,
      customerEmail: input.client.email || null,
      customerPhone: input.client.phone,
      returnUrl: input.manageUrl,
      cancelUrl: input.manageUrl,
      expiresAt: input.expiresAt,
    })
    deposit = (await deposits.update(ctx.organizationId, deposit.id, {
      provider_reference: checkout.reference,
      checkout_url: checkout.checkoutUrl,
    }))!
    return { deposit, checkoutUrl: checkout.checkoutUrl }
  } catch (err) {
    await deposits.update(ctx.organizationId, deposit.id, { status: "EXPIRED" })
    console.error("[deposits] could not start checkout", err)
    throw new ApiError(
      502,
      "PAYMENT_PROVIDER_ERROR",
      "We couldn't start the payment. Please try again in a moment.",
      err instanceof ProviderError ? { provider: provider.id } : undefined
    )
  }
}

export type PaidOutcome = "confirmed" | "already_paid" | "refunded_slot_taken" | "not_found"

/**
 * Records a successful deposit payment. Idempotent: webhooks and the return
 * redirect may both report the same payment. If the hold expired and the
 * slot has been taken since, the deposit is refunded instead.
 */
export async function markDepositPaid(orgId: string, depositId: string): Promise<PaidOutcome> {
  const repos = await getRepositories()
  const ctx = await getSystemContext(orgId)
  const deposit = await repos.deposits.get(orgId, depositId)
  if (!deposit) return "not_found"
  if (deposit.status === "PAID" || deposit.status === "FORFEITED") return "already_paid"

  const [appointment, org, clock] = await Promise.all([
    repos.appointments.get(orgId, deposit.appointment_id),
    repos.organizations.get(orgId),
    getBusinessClock(ctx),
  ])
  if (!appointment || !org) return "not_found"

  // Record the money first: it has arrived either way
  const payment = await repos.payments.create(orgId, {
    appointment_id: appointment.id,
    client_id: appointment.client_id,
    staff_id: appointment.staff_id,
    amount: deposit.amount,
    payment_method: "CARD",
    payment_date: clock.todayKey,
    status: "COMPLETED",
    reference_note: `Online deposit (${deposit.provider === "DEMO" ? "demo" : deposit.provider.toLowerCase()} ${deposit.provider_reference})`,
  })
  await repos.deposits.update(orgId, deposit.id, { status: "PAID", payment_id: payment.id, paid_at: new Date().toISOString() })

  // A late payment for a hold that already expired: rebook if the slot is still free
  let slotFree = appointment.status === "PENDING_DEPOSIT" || appointment.status === "SCHEDULED"
  if (appointment.status === "CANCELLED") {
    try {
      await assertNoConflicts(
        ctx,
        { start: new Date(appointment.scheduled_at), duration: appointment.duration_minutes, staffId: appointment.staff_id, clientId: appointment.client_id, excludeId: appointment.id },
        clock.timezone
      )
      slotFree = Date.parse(appointment.scheduled_at) > Date.now()
    } catch {
      slotFree = false
    }
  }

  const client = await repos.clients.get(orgId, appointment.client_id)
  if (!slotFree) {
    await refundDeposit(orgId, { ...deposit, status: "PAID", payment_id: payment.id })
    if (client) {
      await sendClientMessage(ctx, {
        kind: "CANCELLATION",
        org,
        appointment,
        client,
        extra: { refund_line: `Your deposit arrived after the hold expired and the time was taken, so we've refunded ${formatMoney(deposit.amount, deposit.currency)}.` },
      })
    }
    return "refunded_slot_taken"
  }

  const confirmed = (await repos.appointments.update(orgId, appointment.id, { status: "SCHEDULED", hold_expires_at: null }))!
  if (client) await sendClientMessage(ctx, { kind: "BOOKING_CONFIRMATION", org, appointment: confirmed, client })
  return "confirmed"
}

/** Refunds through the provider and marks the deposit and its payment refunded. */
export async function refundDeposit(orgId: string, deposit: Deposit) {
  const repos = await getRepositories()
  if (deposit.status !== "PAID") return
  try {
    await getProviderById(deposit.provider).refund(deposit.provider_reference)
  } catch (err) {
    // Leave it PAID so staff can see it still needs a refund
    console.error("[deposits] refund failed", err)
    throw new ApiError(502, "PAYMENT_PROVIDER_ERROR", "The refund didn't go through with the payment provider. Try again or refund it from the provider's dashboard.")
  }
  await repos.deposits.update(orgId, deposit.id, { status: "REFUNDED" })
  if (deposit.payment_id) {
    await repos.payments.update(orgId, deposit.payment_id, { status: "REFUNDED", reference_note: "Online deposit (refunded)" })
  }
}

/** The paid deposit on an appointment, if any. */
export async function paidDepositFor(orgId: string, appointmentId: string) {
  const { deposits } = await getRepositories()
  return (await deposits.list(orgId, { appointmentId })).find((d) => d.status === "PAID") ?? null
}

/** Whether cancelling now is early enough for a refund under the business's policy. */
export function withinFreeCancellation(org: Organization, appointment: Appointment, nowMs = Date.now()) {
  return Date.parse(appointment.scheduled_at) - nowMs >= org.booking.cancellation_notice_hours * 3_600_000
}

/**
 * Settles the deposit when an appointment stops going ahead. "refund" gives
 * the money back; "keep" keeps it (late cancellation, no-show). Returns what
 * happened so callers can word the client message.
 */
export async function settleDeposit(
  orgId: string,
  appointment: Appointment,
  action: "refund" | "keep"
): Promise<{ deposit: Deposit; outcome: "refunded" | "kept" } | null> {
  const repos = await getRepositories()
  const deposits = await repos.deposits.list(orgId, { appointmentId: appointment.id })
  // Never paid: the checkout simply expires
  for (const pending of deposits.filter((d) => d.status === "PENDING")) {
    await repos.deposits.update(orgId, pending.id, { status: "EXPIRED" })
  }
  const paid = deposits.find((d) => d.status === "PAID")
  if (!paid) return null
  if (action === "refund") {
    await refundDeposit(orgId, paid)
    return { deposit: paid, outcome: "refunded" }
  }
  await repos.deposits.update(orgId, paid.id, { status: "FORFEITED" })
  if (paid.payment_id) await repos.payments.update(orgId, paid.payment_id, { reference_note: "Online deposit (kept)" })
  return { deposit: paid, outcome: "kept" }
}

/** Cancels online bookings whose deposit wasn't paid in time, freeing their slots. */
export async function releaseExpiredHolds(orgId: string): Promise<number> {
  const repos = await getRepositories()
  const pending = await repos.appointments.list(orgId, { status: "PENDING_DEPOSIT" })
  const now = Date.now()
  let released = 0
  for (const appointment of pending) {
    if (appointment.hold_expires_at && Date.parse(appointment.hold_expires_at) > now) continue
    await repos.appointments.update(orgId, appointment.id, {
      status: "CANCELLED",
      hold_expires_at: null,
      notes: [appointment.notes, "Released: deposit not paid in time."].filter(Boolean).join(" "),
    })
    await settleDeposit(orgId, appointment, "refund")
    released += 1
  }
  return released
}

/** Called from webhooks: find the deposit by provider reference and record the payment. */
export async function handleProviderPayment(reference: string): Promise<PaidOutcome> {
  const { deposits } = await getRepositories()
  const found = await deposits.findByReference(reference)
  if (!found) return "not_found"
  return markDepositPaid(found.organizationId, found.deposit.id)
}
