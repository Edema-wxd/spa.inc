import { NextResponse } from "next/server"
import { parseInbound, verifyWhatsAppSignature } from "@/server/messaging/whatsapp"
import { handleInboundReply } from "@/server/services/messaging"

/**
 * WhatsApp Cloud API webhook (Meta App Dashboard > WhatsApp > Configuration).
 * GET: the subscription handshake. POST: client replies ("1" confirms, "2" to change).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  if (expected && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === expected) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 })
  }
  return new Response("forbidden", { status: 403 })
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (!verifyWhatsAppSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }
  const results = []
  for (const message of parseInbound(JSON.parse(raw))) {
    results.push(await handleInboundReply(message.from, message.text, message.id))
  }
  return NextResponse.json({ received: true, results })
}
