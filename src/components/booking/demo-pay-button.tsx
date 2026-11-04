"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"

export function DemoPayButton({
  slug,
  token,
  amountLabel,
  manageHref,
}: {
  slug: string
  token: string
  amountLabel: string
  manageHref: string
}) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  async function pay() {
    setPaying(true)
    try {
      await apiFetch(`/api/public/${slug}/bookings/${token}/demo-pay`, { method: "POST" })
      router.push(manageHref)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed")
      setPaying(false)
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
        {paying && <Loader2 className="h-4 w-4 animate-spin" />}
        Pay {amountLabel} (demo)
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => router.push(manageHref)} disabled={paying}>
        Back
      </Button>
    </div>
  )
}
