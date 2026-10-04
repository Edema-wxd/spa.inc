import "server-only"

import type { Appointment, Client } from "@/types"

/**
 * Outbound messages. Stubbed: logs instead of sending until an email
 * provider (and later the WhatsApp add-on) is connected.
 */
export async function sendAppointmentConfirmationEmail(client: Client, appointment: Appointment) {
  console.info(
    `[notifications] confirmation email to ${client.email} for appointment ${appointment.id} at ${appointment.scheduled_at}`
  )
}

export async function notifySalesTeam(leadId: string, businessName: string) {
  console.info(`[notifications] new sales lead ${leadId} from ${businessName}`)
}
