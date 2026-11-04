import "server-only"

import { hasFeature } from "@/lib/plans"
import { toE164 } from "@/lib/phone"
import { addDays, dateKeyInZone, formatInZone } from "@/lib/time"
import type { Appointment, Client, Message, MessageKind, Organization } from "@/types"
import { getAppUrl, bookingPagePath, manageBookingPath } from "@/server/app-url"
import type { RequestContext } from "@/server/context"
import { getSystemContext } from "@/server/context"
import { sendTemplate, sendText, whatsappConfigured } from "@/server/messaging/whatsapp"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock } from "@/server/services/business"
import { REPLIES, renderMessage, TEMPLATES, type MessageVars, type OutboundKind } from "@/server/services/message-templates"

/** Variables for the templates, in the business's timezone. */
export async function messageVarsFor(
  ctx: RequestContext,
  org: Organization,
  appointment: Appointment,
  client: Client,
  extra: Partial<MessageVars> = {}
): Promise<MessageVars> {
  const repos = await getRepositories()
  const [clock, staff, service] = await Promise.all([
    getBusinessClock(ctx),
    repos.users.get(ctx.organizationId, appointment.staff_id),
    repos.services.get(ctx.organizationId, appointment.service_id),
  ])
  const base = await getAppUrl()
  const day = dateKeyInZone(appointment.scheduled_at, clock.timezone)
  const when =
    day === clock.todayKey
      ? "today"
      : day === addDays(clock.todayKey, 1)
        ? "tomorrow"
        : `on ${formatInZone(appointment.scheduled_at, clock.timezone, { weekday: "long", month: "short", day: "numeric" })}`
  return {
    first_name: client.full_name.split(" ")[0] || client.full_name,
    business: org.name,
    service: service?.name ?? "your appointment",
    staff: staff?.full_name.split(" ")[0] ?? "your therapist",
    date: formatInZone(appointment.scheduled_at, clock.timezone, { weekday: "short", month: "short", day: "numeric" }),
    time: formatInZone(appointment.scheduled_at, clock.timezone, { hour: "numeric", minute: "2-digit" }),
    when,
    link: `${base}${appointment.manage_token ? manageBookingPath(org.slug, appointment.manage_token) : bookingPagePath(org.slug)}`,
    ...extra,
  }
}

/**
 * Sends (or, without a provider, records) a WhatsApp message to the client.
 * Never throws: a messaging problem must not break a booking. Returns null
 * when nothing was sent (no phone, or the plan has no WhatsApp messages).
 */
export async function sendClientMessage(
  ctx: RequestContext,
  input: { kind: OutboundKind; org: Organization; appointment: Appointment; client: Client; extra?: Partial<MessageVars> }
): Promise<Message | null> {
  if (!hasFeature(ctx.plan, "whatsappReminders") || !input.client.phone) return null
  try {
    const vars = await messageVarsFor(ctx, input.org, input.appointment, input.client, input.extra)
    const { body, params } = renderMessage(input.kind, vars)
    const to = toE164(input.client.phone, input.org.country_code)
    return await deliver(ctx.organizationId, {
      kind: input.kind,
      to,
      body,
      appointmentId: input.appointment.id,
      clientId: input.client.id,
      send: () =>
        sendTemplate(to, process.env[`WHATSAPP_TEMPLATE_${input.kind}`] ?? TEMPLATES[input.kind].name, params),
    })
  } catch (err) {
    console.error("[messaging] could not prepare message", err)
    return null
  }
}

async function deliver(
  orgId: string,
  m: { kind: MessageKind; to: string; body: string; appointmentId: string | null; clientId: string | null; send: () => Promise<string> }
) {
  const { messages } = await getRepositories()
  const base = {
    appointment_id: m.appointmentId,
    client_id: m.clientId,
    channel: "WHATSAPP" as const,
    kind: m.kind,
    direction: "OUTBOUND" as const,
    to: m.to,
    body: m.body,
  }
  if (!whatsappConfigured()) {
    return messages.create(orgId, { ...base, status: "SIMULATED", provider_message_id: null, error: null })
  }
  try {
    const id = await m.send()
    return messages.create(orgId, { ...base, status: "SENT", provider_message_id: id, error: null })
  } catch (err) {
    console.error("[messaging] WhatsApp send failed", err)
    return messages.create(orgId, {
      ...base,
      status: "FAILED",
      provider_message_id: null,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// Inbound replies: "1" confirms, "2" asks to change
// ---------------------------------------------------------------------------

const CONFIRM = /^(1|yes|y|confirm|confirmed|ok|okay)\b/i
const CHANGE = /^(2|change|reschedule|cancel|no)\b/i

export async function handleInboundReply(from: string, text: string, providerMessageId: string) {
  const repos = await getRepositories()
  const conversation = await repos.messages.findLatestOutboundTo(from)
  if (!conversation) return { handled: false, reason: "unknown sender" }

  const orgId = conversation.organizationId
  const ctx = await getSystemContext(orgId)
  await repos.messages.create(orgId, {
    appointment_id: conversation.message.appointment_id,
    client_id: conversation.message.client_id,
    channel: "WHATSAPP",
    kind: "REPLY",
    direction: "INBOUND",
    to: from,
    body: text.slice(0, 1000),
    status: "RECEIVED",
    provider_message_id: providerMessageId,
    error: null,
  })

  const [org, appointment, client] = await Promise.all([
    repos.organizations.get(orgId),
    conversation.message.appointment_id ? repos.appointments.get(orgId, conversation.message.appointment_id) : null,
    conversation.message.client_id ? repos.clients.get(orgId, conversation.message.client_id) : null,
  ])
  if (!org || !appointment || !client) return { handled: false, reason: "conversation has no booking" }

  const vars = await messageVarsFor(ctx, org, appointment, client)
  const upcoming = appointment.status === "SCHEDULED" && Date.parse(appointment.scheduled_at) > Date.now()
  let reply: string
  if (CONFIRM.test(text.trim()) && upcoming) {
    await repos.appointments.update(orgId, appointment.id, { confirmed_at: new Date().toISOString() })
    reply = REPLIES.confirmed(vars)
  } else if (CHANGE.test(text.trim())) {
    reply = REPLIES.change(vars)
  } else {
    reply = REPLIES.unknown()
  }
  await deliver(orgId, {
    kind: "REPLY",
    to: from,
    body: reply,
    appointmentId: appointment.id,
    clientId: client.id,
    send: () => sendText(from, reply),
  })
  return { handled: true }
}
