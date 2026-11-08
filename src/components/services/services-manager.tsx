"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/empty-state"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { formatMoney } from "@/lib/booking"
import type { BusinessCurrency, Service } from "@/types"

interface Draft {
  id: string | null
  name: string
  description: string
  duration: string
  price: string
  is_active: boolean
}

const empty: Draft = { id: null, name: "", description: "", duration: "60", price: "", is_active: true }

export function ServicesManager({ services, currency }: { services: Service[]; currency: BusinessCurrency }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const symbol = currency === "NGN" ? "₦" : "$"

  async function save() {
    if (!draft) return
    setSaving(true)
    setErrors({})
    const body = {
      name: draft.name,
      description: draft.description,
      default_duration_minutes: Math.round(Number(draft.duration)),
      default_price: Math.round((Number(draft.price) || 0) * 100),
      is_active: draft.is_active,
    }
    try {
      if (draft.id) await apiFetch(`/api/services/${draft.id}`, { method: "PUT", body })
      else await apiFetch("/api/services", { method: "POST", body: { services: [body] } })
      toast.success(draft.id ? "Treatment saved" : "Treatment added")
      setDraft(null)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        setErrors(
          Object.fromEntries(
            Object.entries(err.details as Record<string, string[]>).map(([k, v]) => [k.replace(/^services\.0\./, ""), v[0]])
          )
        )
      }
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setDraft(empty)}>
          <Plus className="h-4 w-4" />
          Add treatment
        </Button>
      </div>
      {services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-12 w-12" />}
            title="No treatments yet"
            description="Add what you offer with its length and price. Clients book from this menu."
            action={{ label: "Use the starter menu", href: "/dashboard/welcome" }}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {services.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {s.name}
                    {!s.is_active && <Badge variant="secondary">Hidden</Badge>}
                  </p>
                  {s.description && <p className="truncate text-sm text-muted-foreground">{s.description}</p>}
                </div>
                <p className="text-sm text-muted-foreground">{s.default_duration_minutes} min</p>
                <p className="w-24 text-right font-medium tabular-nums">{formatMoney(s.default_price, currency)}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${s.name}`}
                  onClick={() =>
                    setDraft({
                      id: s.id,
                      name: s.name,
                      description: s.description,
                      duration: String(s.default_duration_minutes),
                      price: String(s.default_price / 100),
                      is_active: s.is_active,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit treatment" : "Add treatment"}</DialogTitle>
            <DialogDescription>Length sets how much of the calendar a booking takes.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="svc-name">Name</Label>
                <Input id="svc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="svc-duration">Length (minutes)</Label>
                  <Input id="svc-duration" type="number" min={15} step={15} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
                  {errors.default_duration_minutes && <p className="text-xs text-destructive">{errors.default_duration_minutes}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="svc-price">Price ({symbol})</Label>
                  <Input id="svc-price" type="number" min={0} step="0.01" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                  {errors.default_price && <p className="text-xs text-destructive">{errors.default_price}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-description">Description (shown on your booking page)</Label>
                <Textarea id="svc-description" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="svc-active" className="font-normal">
                  Bookable
                  <span className="block text-xs text-muted-foreground">Hide a treatment without losing its history</span>
                </Label>
                <Switch id="svc-active" checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
