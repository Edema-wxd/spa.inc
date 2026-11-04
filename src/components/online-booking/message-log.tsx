"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Loader2, MessageSquare, Send } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { apiFetch } from "@/lib/api-client"
import { formatInZone } from "@/lib/time"
import { humanize } from "@/lib/utils"
import type { OnlineBookingOverview } from "@/server/services/booking-settings"

export function MessageLog({
  messages,
  timezone,
  canRunReminders,
}: {
  messages: OnlineBookingOverview["messages"]
  timezone: string
  canRunReminders: boolean
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function runReminders() {
    setRunning(true)
    try {
      const { message } = await apiFetch("/api/online-booking/reminders", { method: "POST" })
      toast.success(message)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reminders")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Client messages</CardTitle>
          <CardDescription>
            Confirmations, deposit links, reminders and replies, newest first. Reminders go out automatically every hour.
          </CardDescription>
        </div>
        {canRunReminders && (
          <Button variant="outline" size="sm" onClick={runReminders} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send due reminders now
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageSquare className="h-10 w-10" />}
            title="No messages yet"
            description={
              canRunReminders
                ? "When clients book, their confirmation and reminder will show up here."
                : "WhatsApp confirmations and reminders start on the Manager plan."
            }
          />
        ) : (
          <ul className="divide-y">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-3 py-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    m.direction === "INBOUND" ? "bg-sky-100 text-sky-700" : "bg-spa-50 text-spa-primary"
                  }`}
                  aria-label={m.direction === "INBOUND" ? "From client" : "To client"}
                >
                  {m.direction === "INBOUND" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {m.client_id ? (
                      <Link href={`/dashboard/clients/${m.client_id}`} className="font-medium hover:underline">
                        {m.client_name}
                      </Link>
                    ) : (
                      <span className="font-medium">+{m.to}</span>
                    )}
                    <span className="text-muted-foreground">{humanize(m.kind)}</span>
                    <StatusBadge status={m.status} className="text-[10px]" />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatInZone(m.created_at, timezone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
                  {m.error && <p className="mt-1 text-xs text-destructive">{m.error}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
