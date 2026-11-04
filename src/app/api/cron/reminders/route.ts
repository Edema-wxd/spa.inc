import { NextResponse } from "next/server"
import { runAllReminders } from "@/server/services/reminders"

/**
 * Scheduled job: day-before reminders and releasing unpaid holds, for every
 * business. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`
 * (see vercel.json). Without CRON_SECRET it only runs on the demo store.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.DATA_SOURCE !== "prisma"
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const results = await runAllReminders()
  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}
