import "server-only"

import type { PaymentInput } from "@/lib/validation/payments"
import type { RequestContext } from "@/server/context"
import { ApiError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"
import { bucketKey, type Period } from "@/server/services/periods"

export async function listPayments(
  ctx: RequestContext,
  filter: DateRange & { staffId?: string; clientId?: string } = {}
) {
  const { payments } = await getRepositories()
  const staffId = ctx.role === "STAFF" ? ctx.userId : filter.staffId
  return payments.list(ctx.organizationId, { ...filter, staffId })
}

export async function recordPayment(ctx: RequestContext, input: PaymentInput) {
  const repos = await getRepositories()
  const [client, staff] = await Promise.all([
    repos.clients.get(ctx.organizationId, input.client_id),
    repos.users.get(ctx.organizationId, input.staff_id),
  ])
  if (!client) throw new ApiError(422, "VALIDATION_ERROR", "Client does not exist")
  if (!staff) throw new ApiError(422, "VALIDATION_ERROR", "Staff member does not exist")
  return repos.payments.create(ctx.organizationId, input)
}

/** Completed revenue totals bucketed by period. Available on every plan. */
export async function getPaymentSummary(ctx: RequestContext, range: DateRange, period: Period) {
  const payments = (await listPayments(ctx, range)).filter((p) => p.status === "COMPLETED")
  const buckets = new Map<string, number>()
  for (const p of payments) {
    const key = bucketKey(p.payment_date, period)
    buckets.set(key, (buckets.get(key) ?? 0) + p.amount)
  }
  return {
    period,
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
    series: [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, revenue]) => ({ bucket, revenue })),
  }
}
