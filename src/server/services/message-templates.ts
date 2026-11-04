import type { MessageKind } from "@/types"

// ---------------------------------------------------------------------------
// Client message wording
//
// WhatsApp only lets a business start a conversation with a pre-approved
// template, so each outbound kind maps to a named template with numbered
// parameters. The bodies below are what to register in Meta Business Manager
// ({{1}}, {{2}}... in the order of `params`), and what the outbox shows when
// no provider is configured. See docs/ONLINE_BOOKING.md.
// ---------------------------------------------------------------------------

export interface MessageVars {
  first_name: string
  business: string
  service: string
  staff: string
  /** "Tue, Nov 10" */
  date: string
  /** "2:30 PM" */
  time: string
  /** "today", "tomorrow" or the date */
  when: string
  link: string
  amount?: string
  minutes?: number
  refund_line?: string
}

export type OutboundKind = Exclude<MessageKind, "REPLY">

interface Template {
  /** Default WhatsApp template name (override with WHATSAPP_TEMPLATE_<KIND>) */
  name: string
  params: (v: MessageVars) => string[]
  body: (p: string[]) => string
}

export const TEMPLATES: Record<OutboundKind, Template> = {
  BOOKING_CONFIRMATION: {
    name: "booking_confirmation",
    params: (v) => [v.first_name, v.business, v.service, v.staff, v.date, v.time, v.link],
    body: ([first, business, service, staff, date, time, link]) =>
      `Hi ${first}, you're booked at ${business}: ${service} with ${staff}, ${date} at ${time}. Reply 1 to confirm or 2 to change it. Manage your booking: ${link}`,
  },
  DEPOSIT_REQUEST: {
    name: "deposit_request",
    params: (v) => [v.first_name, v.service, v.date, v.time, v.amount ?? "", String(v.minutes ?? 30), v.link],
    body: ([first, service, date, time, amount, minutes, link]) =>
      `Hi ${first}, we're holding ${service} on ${date} at ${time} for you. Pay your ${amount} deposit within ${minutes} minutes to confirm: ${link}`,
  },
  REMINDER: {
    name: "appointment_reminder",
    params: (v) => [v.first_name, v.business, v.service, v.staff, v.when, v.time, v.link],
    body: ([first, business, service, staff, when, time, link]) =>
      `Hi ${first}, a reminder from ${business}: ${service} with ${staff} ${when} at ${time}. Reply 1 to confirm or 2 to change it. ${link}`,
  },
  CANCELLATION: {
    name: "booking_cancelled",
    params: (v) => [v.first_name, v.service, v.date, v.time, v.business, v.refund_line ?? ""],
    body: ([first, service, date, time, business, refund]) =>
      `Hi ${first}, your ${service} on ${date} at ${time} at ${business} is cancelled. ${refund}`.trim(),
  },
}

export function renderMessage(kind: OutboundKind, vars: MessageVars): { body: string; params: string[] } {
  const params = TEMPLATES[kind].params(vars)
  return { body: TEMPLATES[kind].body(params), params }
}

/** Free-form replies inside the 24-hour window opened by the client's message. */
export const REPLIES = {
  confirmed: (v: Pick<MessageVars, "first_name" | "when" | "time">) =>
    `Thanks ${v.first_name}, you're confirmed. See you ${v.when} at ${v.time}.`,
  change: (v: Pick<MessageVars, "first_name" | "link">) =>
    `No problem, ${v.first_name}. You can cancel or pick a new time here: ${v.link}`,
  unknown: () => "Reply 1 to confirm your appointment or 2 to change it.",
}
