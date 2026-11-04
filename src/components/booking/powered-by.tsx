import Link from "next/link"
import { Sparkles } from "lucide-react"

/** Footer on every public booking page: the growth loop back to Spa.Inc. */
export function PoweredBy() {
  return (
    <p className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 text-spa-accent" />
      Booking by{" "}
      <Link href="/pricing" className="font-medium text-spa-primary hover:underline">
        Spa.Inc
      </Link>
      <span aria-hidden>·</span>
      <Link href="/pricing" className="hover:underline">
        Online booking with deposits and WhatsApp reminders for your spa
      </Link>
    </p>
  )
}
