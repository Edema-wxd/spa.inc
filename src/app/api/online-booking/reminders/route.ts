import { getRequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { ok, route } from "@/server/http"
import { runRemindersFor } from "@/server/services/reminders"

/** Admin: send any reminders that are due now (the same job the scheduler runs hourly). */
export const POST = route(async () => {
  const ctx = await getRequestContext()
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "whatsappReminders")
  const result = await runRemindersFor(ctx.organizationId)
  return ok(
    result,
    result.remindersSent ? `Sent ${result.remindersSent} reminder${result.remindersSent === 1 ? "" : "s"}` : "No reminders were due"
  )
})
