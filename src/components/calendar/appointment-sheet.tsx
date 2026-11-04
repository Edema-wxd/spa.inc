"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, CheckCheck, CheckCircle2, Clock, CreditCard, Globe, MapPin, Phone, Repeat, Sparkles, Star, User, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/shared/status-badge"
import { apiFetch } from "@/lib/api-client"
import { formatDateKey, formatMinutes } from "@/lib/time"
import { formatCurrency, formatPhone } from "@/lib/utils"
import type { CalendarAppointment } from "@/server/services/appointments"
import type { AppointmentStatus } from "@/types"

interface AppointmentSheetProps {
  appointment: CalendarAppointment | null
  onOpenChange: (open: boolean) => void
  nowMs: number
  onReschedule: (appointment: CalendarAppointment) => void
  onRebook: (appointment: CalendarAppointment) => void
}

function Row({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function AppointmentSheet({ appointment, onOpenChange, nowMs, onReschedule, onRebook }: AppointmentSheetProps) {
  const router = useRouter()
  const [pending, setPending] = useState<AppointmentStatus | null>(null)

  async function setStatus(status: AppointmentStatus, then?: () => void, deposit?: "refund" | "keep") {
    if (!appointment) return
    setPending(status)
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, { method: "PUT", body: { status, deposit } })
      const label = {
        COMPLETED: "Checked out",
        CANCELLED: deposit === "refund" ? "Cancelled, deposit refunded" : deposit === "keep" ? "Cancelled, deposit kept" : "Booking cancelled",
        NO_SHOW: "Marked as no-show",
        SCHEDULED: "Booking confirmed",
        PENDING_DEPOSIT: "Updated",
      }[status]
      toast.success(`${label}: ${appointment.client_name}`)
      router.refresh()
      then?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the appointment")
    } finally {
      setPending(null)
    }
  }

  const a = appointment
  const started = a ? Date.parse(a.scheduled_at) <= nowMs : false
  const ended = a ? Date.parse(a.scheduled_at) + a.duration * 60_000 <= nowMs : false

  return (
    <Sheet open={!!a} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {a && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{a.client_name}</SheetTitle>
                <StatusBadge status={a.status} />
              </div>
              <SheetDescription>
                {formatDateKey(a.date, { weekday: "long", month: "long", day: "numeric" })},{" "}
                {formatMinutes(a.start)} to {formatMinutes(a.start + a.duration)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4">
              <Row icon={Sparkles}>
                <p className="font-medium">{a.service_name}</p>
                <p className="text-muted-foreground">
                  {a.duration} min · {formatCurrency(a.price)}
                </p>
              </Row>
              <Row icon={User}>
                <p>with {a.staff_name}</p>
              </Row>
              {a.client_phone && (
                <Row icon={Phone}>
                  <a href={`tel:${a.client_phone}`} className="text-spa-accent hover:underline">
                    {formatPhone(a.client_phone)}
                  </a>
                </Row>
              )}
              {a.location_type === "REMOTE" && (
                <Row icon={MapPin}>
                  <p className="font-medium">Mobile visit</p>
                  <p className="text-muted-foreground">{a.location_notes || "No address given"}</p>
                </Row>
              )}
              {a.notes && (
                <Row icon={Clock}>
                  <p className="italic text-muted-foreground">{a.notes}</p>
                </Row>
              )}
              {a.satisfaction_rating !== null && (
                <Row icon={Star}>
                  <p>Rated {a.satisfaction_rating} out of 5</p>
                </Row>
              )}
              {a.source === "ONLINE" && (
                <Row icon={Globe}>
                  <p>Booked online{a.confirmed ? ", confirmed by the client" : ""}</p>
                </Row>
              )}
              {a.source !== "ONLINE" && a.confirmed && (
                <Row icon={CheckCheck}>
                  <p>Confirmed by the client</p>
                </Row>
              )}
              {a.deposit && (
                <Row icon={CreditCard}>
                  <p>
                    {formatCurrency(a.deposit.amount)} deposit{" "}
                    <span className="text-muted-foreground">
                      {{ PENDING: "not paid yet", PAID: "paid", REFUNDED: "refunded", FORFEITED: "kept", EXPIRED: "expired" }[a.deposit.status]}
                    </span>
                  </p>
                  {a.status === "PENDING_DEPOSIT" && a.hold_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Slot held until {new Date(a.hold_expires_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </Row>
              )}
              {(a.status === "COMPLETED" || a.amount_paid > 0) && (
                <Row icon={CreditCard}>
                  <p className={a.paid ? "text-emerald-700" : "text-amber-700"}>
                    {a.paid ? "Paid in full" : a.amount_paid > 0 ? `${formatCurrency(a.amount_paid)} paid, ${formatCurrency(Math.max(0, a.price - a.amount_paid))} due` : "Not paid yet"}
                  </p>
                </Row>
              )}
              <Button asChild variant="link" className="h-auto p-0">
                <Link href={`/dashboard/clients/${a.client_id}`}>View client profile</Link>
              </Button>
            </div>

            <Separator className="my-2" />

            <div className="grid gap-2 px-4 pb-6">
              {a.status === "PENDING_DEPOSIT" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    The client is paying the deposit online. If they don&apos;t pay before the hold ends, the slot is released.
                  </p>
                  <Button variant="outline" disabled={pending !== null} onClick={() => setStatus("SCHEDULED")}>
                    Confirm without deposit
                  </Button>
                  <Button variant="outline" disabled={pending !== null} onClick={() => setStatus("CANCELLED")}>
                    <XCircle className="h-4 w-4" />
                    Release slot
                  </Button>
                </>
              )}
              {a.status === "SCHEDULED" && (
                <>
                  <Button
                    disabled={!started || pending !== null}
                    title={started ? undefined : "Available once the appointment starts"}
                    onClick={() => setStatus("COMPLETED", () => router.push(`/dashboard/payments/new?appointment=${a.id}`))}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Check out and take payment
                  </Button>
                  <Button variant="outline" disabled={pending !== null} onClick={() => onReschedule(a)}>
                    <CalendarClock className="h-4 w-4" />
                    Reschedule
                  </Button>
                  {a.deposit?.status === "PAID" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" disabled={pending !== null} onClick={() => setStatus("CANCELLED", undefined, "refund")}>
                        Cancel, refund deposit
                      </Button>
                      <Button variant="outline" disabled={pending !== null} onClick={() => setStatus("CANCELLED", undefined, "keep")}>
                        Cancel, keep deposit
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {a.deposit?.status !== "PAID" && (
                      <Button variant="outline" disabled={pending !== null} onClick={() => setStatus("CANCELLED")}>
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={!ended || pending !== null}
                      title={ended ? undefined : "Available after the appointment time"}
                      onClick={() => setStatus("NO_SHOW")}
                    >
                      No-show
                    </Button>
                  </div>
                </>
              )}
              {a.status === "COMPLETED" && !a.paid && (
                <Button asChild>
                  <Link href={`/dashboard/payments/new?appointment=${a.id}`}>
                    <CreditCard className="h-4 w-4" />
                    Take payment
                  </Link>
                </Button>
              )}
              {(a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "NO_SHOW") && (
                <Button variant="outline" onClick={() => onRebook(a)}>
                  <Repeat className="h-4 w-4" />
                  Book again
                </Button>
              )}
              {a.status === "CANCELLED" && !started && (
                <Button variant="ghost" disabled={pending !== null} onClick={() => setStatus("SCHEDULED")}>
                  Restore booking
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
