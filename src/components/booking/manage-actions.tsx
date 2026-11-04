"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, CreditCard, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import type { PublicBookingView } from "@/server/services/online-booking"

function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Date.parse(until) - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [until])
  if (left === null) return null
  const minutes = Math.floor(left / 60_000)
  const seconds = Math.floor((left % 60_000) / 1000)
  return (
    <p className="text-center text-sm text-muted-foreground" aria-live="polite">
      {left > 0 ? (
        <>
          Held for you for <span className="font-semibold tabular-nums text-foreground">{minutes}:{String(seconds).padStart(2, "0")}</span>
        </>
      ) : (
        "The hold has expired. Refresh to see if the time is still free."
      )}
    </p>
  )
}

export function ManageActions({ booking }: { booking: PublicBookingView }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const base = `/api/public/${booking.business.slug}/bookings/${booking.token}`

  async function cancel() {
    setCancelling(true)
    try {
      await apiFetch(`${base}/cancel`, { method: "POST" })
      toast.success("Your booking is cancelled")
      setConfirmOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel. Please call us.")
    } finally {
      setCancelling(false)
    }
  }

  const deposit = booking.deposit

  return (
    <div className="space-y-3">
      {booking.status === "PENDING_DEPOSIT" && deposit?.checkoutUrl && (
        <>
          <Button asChild size="lg" className="w-full">
            <a href={deposit.checkoutUrl}>
              <CreditCard className="h-4 w-4" />
              Pay {deposit.amountLabel} deposit
            </a>
          </Button>
          {deposit.holdExpiresAt && <Countdown until={deposit.holdExpiresAt} />}
        </>
      )}

      {(booking.status === "SCHEDULED" || booking.status === "PENDING_DEPOSIT") && booking.upcoming && (
        <div className="grid gap-2 sm:grid-cols-2">
          {booking.status === "SCHEDULED" && (
            <Button asChild variant="outline">
              <a href={`${base}/ics`}>
                <CalendarPlus className="h-4 w-4" />
                Add to calendar
              </a>
            </Button>
          )}
          {booking.canCancel && (
            <Button variant="outline" onClick={() => setConfirmOpen(true)} className={booking.status === "PENDING_DEPOSIT" ? "sm:col-span-2" : undefined}>
              <XCircle className="h-4 w-4" />
              Cancel booking
            </Button>
          )}
        </div>
      )}

      {booking.freeCancellationUntil && (
        <p className="text-center text-xs text-muted-foreground">Free cancellation until {booking.freeCancellationUntil}.</p>
      )}

      {!booking.upcoming || booking.status === "CANCELLED" ? (
        <Button asChild className="w-full">
          <a href={`/book/${booking.business.slug}`}>Book again</a>
        </Button>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {deposit?.status === "PAID"
                ? booking.lateCancellation
                  ? `This is inside the cancellation window, so the ${deposit.amountLabel} deposit will be kept.`
                  : `Your ${deposit.amountLabel} deposit will be refunded to your card.`
                : "Your time will be released for someone else."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
