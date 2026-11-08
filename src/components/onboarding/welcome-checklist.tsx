"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CalendarPlus, Copy, Globe, Loader2, MessageCircle, Sparkles, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { formatMoney } from "@/lib/booking"
import { cn } from "@/lib/utils"
import type { OnboardingState } from "@/server/services/onboarding"

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const minutes = 6 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
})
const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function Step({
  number,
  title,
  done,
  open,
  onOpen,
  icon: Icon,
  summary,
  children,
}: {
  number: number
  title: string
  done: boolean
  open: boolean
  onOpen: () => void
  icon: typeof Sparkles
  summary: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-xl border bg-card", open && "ring-1 ring-spa-accent")}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={open}>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            done ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground"
          )}
        >
          {done ? <Check className="h-4 w-4" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <Icon className="h-4 w-4 text-spa-accent" />
            {title}
          </p>
          <p className="truncate text-sm text-muted-foreground">{summary}</p>
        </div>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </section>
  )
}

function ServicesStep({ state, onDone }: { state: OnboardingState; onDone: () => void }) {
  const [items, setItems] = useState(
    state.starterMenu.map((item) => ({ ...item, priceText: String(item.price / 100) }))
  )
  const [saving, setSaving] = useState(false)
  const symbol = state.business.currency === "NGN" ? "₦" : "$"

  if (state.steps.services) {
    return (
      <div className="space-y-3 text-sm">
        <ul className="grid gap-1 sm:grid-cols-2">
          {state.services.map((s) => (
            <li key={s.id} className="flex justify-between rounded-md bg-muted/60 px-3 py-1.5">
              <span>{s.name}</span>
              <span className="text-muted-foreground">
                {s.duration} min, {formatMoney(s.price, state.business.currency)}
              </span>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/services">Edit treatments and prices</Link>
        </Button>
      </div>
    )
  }

  async function save() {
    const chosen = items.filter((i) => i.selected)
    if (chosen.length === 0) return toast.error("Choose at least one treatment")
    setSaving(true)
    try {
      await apiFetch("/api/services", {
        method: "POST",
        body: {
          services: chosen.map((i) => ({
            name: i.name,
            description: i.description,
            default_duration_minutes: i.duration,
            default_price: Math.round((Number(i.priceText) || 0) * 100),
            is_active: true,
          })),
        },
      })
      toast.success(`Added ${chosen.length} treatments`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add treatments")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tick what you offer and set your prices. You can add your own later.</p>
      <ul className="divide-y rounded-lg border">
        {items.map((item, index) => (
          <li key={item.key} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <Checkbox
              id={`svc-${item.key}`}
              checked={item.selected}
              onCheckedChange={(v) => setItems((all) => all.map((x, i) => (i === index ? { ...x, selected: v === true } : x)))}
            />
            <Label htmlFor={`svc-${item.key}`} className="min-w-0 flex-1 font-normal">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground"> · {item.duration} min</span>
            </Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{symbol}</span>
              <Input
                aria-label={`${item.name} price`}
                type="number"
                inputMode="decimal"
                min="0"
                className="h-8 w-24"
                value={item.priceText}
                onChange={(e) => setItems((all) => all.map((x, i) => (i === index ? { ...x, priceText: e.target.value, selected: true } : x)))}
              />
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Add {items.filter((i) => i.selected).length} treatments
      </Button>
    </div>
  )
}

function TeamStep({ state, onDone }: { state: OnboardingState; onDone: () => void }) {
  const [self, setSelf] = useState(!state.ownerIsBookable)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [days, setDays] = useState([1, 2, 3, 4, 5])
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("17:00")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function save() {
    setSaving(true)
    setErrors({})
    try {
      const { message } = await apiFetch("/api/onboarding/team", {
        method: "POST",
        body: { self, full_name: self ? undefined : name, email: self ? undefined : email, days, start_time: start, end_time: end },
      })
      toast.success(message)
      setName("")
      setEmail("")
      setSelf(false)
      onDone()
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        setErrors(Object.fromEntries(Object.entries(err.details as Record<string, string[]>).map(([k, v]) => [k, v[0]])))
      }
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {state.team.length > 0 && (
        <ul className="space-y-1 text-sm">
          {state.team.map((m) => (
            <li key={m.id} className="flex justify-between rounded-md bg-muted/60 px-3 py-1.5">
              <span>
                {m.name}
                {m.isOwner && <span className="text-muted-foreground"> (you)</span>}
              </span>
              <span className="text-muted-foreground">{DAYS.filter((d) => m.days.includes(d.value)).map((d) => d.label).join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who are you adding">
        {!state.ownerIsBookable && (
          <Button type="button" size="sm" variant={self ? "default" : "outline"} onClick={() => setSelf(true)} aria-pressed={self}>
            I do treatments myself
          </Button>
        )}
        <Button type="button" size="sm" variant={!self ? "default" : "outline"} onClick={() => setSelf(false)} aria-pressed={!self}>
          <UserPlus className="h-4 w-4" />
          Add a therapist
        </Button>
      </div>
      {!self && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="member-email">Email (they sign in with it)</Label>
            <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Working days</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const on = days.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                onClick={() => setDays((all) => (on ? all.filter((x) => x !== d.value) : [...all, d.value]))}
                className={cn("w-12 rounded-md border py-1.5 text-sm", on ? "border-spa-primary bg-spa-primary text-white" : "bg-background")}
              >
                {d.label}
              </button>
            )
          })}
        </div>
        {errors.days && <p className="text-xs text-destructive">{errors.days}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Select value={start} onValueChange={setStart}>
            <SelectTrigger className="w-32" aria-label="Start time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {timeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Select value={end} onValueChange={setEnd}>
            <SelectTrigger className="w-32" aria-label="End time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {timeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {self ? "Put me on the calendar" : "Add therapist"}
        </Button>
      </div>
      {errors.end_time && <p className="text-xs text-destructive">{errors.end_time}</p>}
    </div>
  )
}

function ShareStep({ state, onDone }: { state: OnboardingState; onDone: () => void }) {
  async function markShared() {
    await apiFetch("/api/onboarding/progress", { method: "POST", body: { action: "link_shared" } }).catch(() => null)
    onDone()
  }
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Book your next visit at ${state.business.name}: ${state.bookingUrl}`)}`
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Clients book themselves from this page, 24/7. Put it in your Instagram bio and WhatsApp Business profile.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={state.bookingUrl} aria-label="Booking link" className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(state.bookingUrl).catch(() => null)
            toast.success("Link copied")
            await markShared()
          }}
        >
          <Copy className="h-4 w-4" />
          Copy link
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" onClick={markShared}>
          <a href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" />
            Share on WhatsApp
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm" onClick={markShared}>
          <a href={`/book/${state.business.slug}`} target="_blank" rel="noreferrer">
            <Globe className="h-4 w-4" />
            Open my booking page
          </a>
        </Button>
      </div>
    </div>
  )
}

export function WelcomeChecklist({ state }: { state: OnboardingState }) {
  const router = useRouter()
  const firstOpen = (["services", "team", "link", "booking"] as const).find((k) => !state.steps[k]) ?? "booking"
  const [open, setOpen] = useState<string>(firstOpen)
  const refresh = () => {
    router.refresh()
    const order = ["services", "team", "link", "booking"]
    setOpen(order[Math.min(order.indexOf(open) + 1, order.length - 1)])
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {state.done} of {state.total} done
          </span>
          {!state.complete && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await apiFetch("/api/onboarding/progress", { method: "POST", body: { action: "dismiss" } }).catch(() => null)
                router.push("/dashboard")
              }}
            >
              Skip for now
            </button>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={state.done} aria-valuemax={state.total}>
          <div className="h-full bg-spa-accent transition-all" style={{ width: `${(state.done / state.total) * 100}%` }} />
        </div>
      </div>

      <Step
        number={1}
        title="Add your treatments"
        icon={Sparkles}
        done={state.steps.services}
        open={open === "services"}
        onOpen={() => setOpen("services")}
        summary={state.steps.services ? `${state.services.length} treatments on your menu` : "Start from a typical spa menu and set your prices"}
      >
        <ServicesStep state={state} onDone={refresh} />
      </Step>
      <Step
        number={2}
        title="Set who takes bookings, and when"
        icon={Users}
        done={state.steps.team}
        open={open === "team"}
        onOpen={() => setOpen("team")}
        summary={state.steps.team ? state.team.map((m) => m.name).join(", ") : "You, your therapists, and your working hours"}
      >
        <TeamStep state={state} onDone={refresh} />
      </Step>
      <Step
        number={3}
        title="Share your booking link"
        icon={Globe}
        done={state.steps.link}
        open={open === "link"}
        onOpen={() => setOpen("link")}
        summary={state.bookingUrl.replace(/^https?:\/\//, "")}
      >
        <ShareStep state={state} onDone={refresh} />
      </Step>
      <Step
        number={4}
        title="Take your first booking"
        icon={CalendarPlus}
        done={state.steps.booking}
        open={open === "booking"}
        onOpen={() => setOpen("booking")}
        summary={state.steps.booking ? "Your calendar is up and running" : "Book a client yourself, or try your booking page as a client would"}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild disabled={!state.steps.services || !state.steps.team}>
            <Link href="/dashboard/calendar?book=1">
              <CalendarPlus className="h-4 w-4" />
              Book an appointment
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`/book/${state.business.slug}`} target="_blank" rel="noreferrer">
              Try it as a client
            </a>
          </Button>
        </div>
        {(!state.steps.services || !state.steps.team) && (
          <p className="mt-2 text-xs text-muted-foreground">Add treatments and working hours first, so there are times to book.</p>
        )}
      </Step>

      {state.complete && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          You&apos;re set up. Bookings, deposits and reminders now run on their own.{" "}
          <Link href="/dashboard" className="font-semibold underline">
            Go to your dashboard
          </Link>
        </div>
      )}
    </div>
  )
}
