import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

// WhatsApp Business Cloud API.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
// Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET,
//      WHATSAPP_VERIFY_TOKEN, optional WHATSAPP_API_VERSION, WHATSAPP_TEMPLATE_LANGUAGE,
//      WHATSAPP_TEMPLATE_<KIND> to rename a template.

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

async function post(payload: Record<string, unknown>): Promise<string> {
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0"
  const response = await fetch(
    `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    }
  )
  const json = (await response.json().catch(() => null)) as {
    messages?: { id: string }[]
    error?: { message?: string }
  } | null
  if (!response.ok || !json?.messages?.[0]?.id) {
    throw new Error(json?.error?.message ?? `WhatsApp API HTTP ${response.status}`)
  }
  return json.messages[0].id
}

/** Business-initiated message: must use an approved template. Returns the WhatsApp message id. */
export function sendTemplate(to: string, template: string, params: string[]) {
  return post({
    to,
    type: "template",
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
    },
  })
}

/** Free-form text, allowed within 24 hours of the client's last message. */
export function sendText(to: string, body: string) {
  return post({ to, type: "text", text: { body, preview_url: true } })
}

/** X-Hub-Signature-256: "sha256=<hex HMAC of the raw body with the app secret>". */
export function verifyWhatsAppSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !header?.startsWith("sha256=")) return false
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"))
  const given = Buffer.from(header.slice("sha256=".length))
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export interface InboundText {
  from: string
  id: string
  text: string
}

/** Text messages from a webhook payload (status updates and media are ignored). */
export function parseInbound(payload: unknown): InboundText[] {
  const out: InboundText[] = []
  const entries = (payload as { entry?: { changes?: { value?: { messages?: unknown[] } }[] }[] })?.entry ?? []
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const raw of change.value?.messages ?? []) {
        const m = raw as { from?: string; id?: string; type?: string; text?: { body?: string }; button?: { text?: string } }
        const text = m.type === "text" ? m.text?.body : m.type === "button" ? m.button?.text : undefined
        if (m.from && m.id && text) out.push({ from: m.from, id: m.id, text })
      }
    }
  }
  return out
}
