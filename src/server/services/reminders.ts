import "server-only"

import { hasFeature } from "@/lib/plans"
import { getSystemContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"
import { releaseExpiredHolds } from "@/server/services/deposits"
import { sendClientMessage } from "@/server/services/messaging"

export interface ReminderRunResult {
  organizationId: string
  releasedHolds: number
  remindersSent: number
  skipped?: string
}

/**
 * Sends the day-before reminder for every upcoming booking inside the
 * business's reminder window that hasn't had one, and releases unpaid holds.
 * Safe to run as often as you like: each booking is reminded once.
 */
export async function runRemindersFor(organizationId: string): Promise<ReminderRunResult> {
  const repos = await getRepositories()
  const ctx = await getSystemContext(organizationId)
  const releasedHolds = await releaseExpiredHolds(organizationId)
  const org = await repos.organizations.get(organizationId)
  if (!org) return { organizationId, releasedHolds, remindersSent: 0, skipped: "no organization" }
  if (!org.booking.reminders_enabled) return { organizationId, releasedHolds, remindersSent: 0, skipped: "reminders are off" }
  if (!hasFeature(ctx.plan, "whatsappReminders")) {
    return { organizationId, releasedHolds, remindersSent: 0, skipped: "plan has no WhatsApp reminders" }
  }

  const now = Date.now()
  const horizon = now + org.booking.reminder_hours_before * 3_600_000
  const upcoming = await repos.appointments.list(organizationId, {
    status: "SCHEDULED",
    from: new Date(now).toISOString().slice(0, 10),
    to: new Date(horizon + 86_400_000).toISOString().slice(0, 10),
  })
  let remindersSent = 0
  for (const appointment of upcoming) {
    const start = Date.parse(appointment.scheduled_at)
    if (start <= now || start > horizon || appointment.reminder_sent_at) continue
    // Booked in the last two hours: the confirmation is reminder enough
    if (now - Date.parse(appointment.created_at) < 2 * 3_600_000) continue
    const client = await repos.clients.get(organizationId, appointment.client_id)
    if (!client?.phone) continue
    const message = await sendClientMessage(ctx, { kind: "REMINDER", org, appointment, client })
    if (message) {
      await repos.appointments.update(organizationId, appointment.id, { reminder_sent_at: new Date().toISOString() })
      remindersSent += 1
    }
  }
  return { organizationId, releasedHolds, remindersSent }
}

/** Every organization (the scheduled job). */
export async function runAllReminders(): Promise<ReminderRunResult[]> {
  const { organizations } = await getRepositories()
  const results: ReminderRunResult[] = []
  for (const org of await organizations.listAll()) results.push(await runRemindersFor(org.id))
  return results
}
