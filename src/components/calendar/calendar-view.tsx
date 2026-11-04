"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarPlus, CheckCheck, ChevronLeft, ChevronRight, CreditCard, Globe, Hourglass, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/shared/empty-state"
import { BookingDialog, type BookingDraft } from "@/components/calendar/booking-dialog"
import { AppointmentSheet } from "@/components/calendar/appointment-sheet"
import {
  addDays,
  formatDateKey,
  formatMinutes,
  minutesInZone,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
} from "@/lib/time"
import { cn, formatCurrency } from "@/lib/utils"
import type { BookingOptions, CalendarAppointment, CalendarData } from "@/server/services/appointments"

const HOUR_PX = 64
const SLOT_MINUTES = 30

const STATUS_STYLES: Record<CalendarAppointment["status"], string> = {
  PENDING_DEPOSIT: "border-amber-400 border-dashed bg-amber-50 text-amber-900 hover:bg-amber-100",
  SCHEDULED: "border-spa-accent bg-spa-light text-spa-primary hover:bg-spa-light/80",
  COMPLETED: "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  CANCELLED: "border-gray-300 bg-gray-50 text-gray-500 line-through opacity-70",
  NO_SHOW: "border-red-400 bg-red-50 text-red-800",
}

interface Column {
  key: string
  date: string
  staffId: string
  title: string
  subtitle: string
  shift: { start: number; end: number } | null
  isToday: boolean
}

/** Side-by-side lanes for overlapping blocks (e.g. a cancellation and its replacement). */
function layoutLanes(items: CalendarAppointment[]) {
  const result = new Map<string, { lane: number; lanes: number }>()
  const sorted = [...items].sort((a, b) => a.start - b.start || b.duration - a.duration)
  let cluster: { id: string; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    for (const c of cluster) result.set(c.id, { lane: c.lane, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
  }
  for (const item of sorted) {
    if (item.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = laneEnds.push(0) - 1
    laneEnds[lane] = item.start + item.duration
    cluster.push({ id: item.id, lane })
    clusterEnd = Math.max(clusterEnd, item.start + item.duration)
  }
  flush()
  return result
}

export function CalendarView({
  data,
  options,
  initialBooking,
}: {
  data: CalendarData
  options: BookingOptions
  initialBooking: { clientId?: string } | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BookingDraft | null>(
    initialBooking
      ? {
          mode: "create",
          client_id: initialBooking.clientId,
          date: data.date < data.todayKey ? data.todayKey : data.date,
          staff_id: data.columns[0],
        }
      : null
  )
  const [draftVersion, setDraftVersion] = useState(0)

  // Keep the "now" line moving without a server round trip
  const [nowMinutes, setNowMinutes] = useState(data.nowMinutes)
  const [nowMs, setNowMs] = useState(() => Date.parse(data.now))
  useEffect(() => {
    const tick = () => {
      setNowMinutes(minutesInZone(new Date(), data.timezone))
      setNowMs(Date.now())
    }
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [data.timezone])

  const href = (params: { date?: string; view?: string; staff?: string | null }) => {
    const search = new URLSearchParams()
    search.set("view", params.view ?? data.view)
    search.set("date", params.date ?? data.date)
    const staff = params.staff === undefined ? data.selectedStaffId : params.staff
    if ((params.view ?? data.view) === "week" && staff) search.set("staff", staff)
    return `${pathname}?${search}`
  }

  const step = data.view === "week" ? 7 : 1
  const staffName = (id: string) => data.staff.find((s) => s.id === id)?.full_name ?? ""
  const shiftOf = (staffId: string, date: string) => {
    const s = data.schedules.find((x) => x.staff_id === staffId && x.day_of_week === weekdayOf(date))
    return s ? { start: timeToMinutes(s.start_time), end: timeToMinutes(s.end_time) } : null
  }

  const visible = useMemo(
    () => data.appointments.filter((a) => showCancelled || a.status !== "CANCELLED"),
    [data.appointments, showCancelled]
  )

  // Day view: therapists working today (or with bookings); week view: one therapist across 7 days
  const columns: Column[] = (() => {
    if (data.view === "week") {
      const staffId = data.selectedStaffId
      if (!staffId) return []
      return data.days.map((date) => {
        const shift = shiftOf(staffId, date)
        return {
          key: date,
          date,
          staffId,
          title: formatDateKey(date, { weekday: "short", day: "numeric" }),
          subtitle: shift ? `${formatMinutes(shift.start)} to ${formatMinutes(shift.end)}` : "Off",
          shift,
          isToday: date === data.todayKey,
        }
      })
    }
    return data.columns
      .map((staffId) => {
        const shift = shiftOf(staffId, data.date)
        return {
          key: staffId,
          date: data.date,
          staffId,
          title: staffName(staffId),
          subtitle: shift ? `${formatMinutes(shift.start)} to ${formatMinutes(shift.end)}` : "Off",
          shift,
          isToday: data.date === data.todayKey,
        }
      })
      .filter((c) => c.shift || data.appointments.some((a) => a.staff_id === c.staffId))
  })()

  const offToday =
    data.view === "day" ? data.columns.filter((id) => !columns.some((c) => c.staffId === id)).map(staffName) : []

  // Summary for the visible range
  const live = visible.filter((a) => a.status === "SCHEDULED" || a.status === "COMPLETED" || a.status === "PENDING_DEPOSIT")
  const bookedMinutes = live.reduce((sum, a) => sum + a.duration, 0)
  const shiftMinutes = columns.reduce((sum, c) => sum + (c.shift ? c.shift.end - c.shift.start : 0), 0)
  const bookedValue = live.reduce((sum, a) => sum + a.price, 0)

  const selected = data.appointments.find((a) => a.id === selectedId) ?? null
  const height = ((data.range.end - data.range.start) / 60) * HOUR_PX
  const hours = Array.from({ length: (data.range.end - data.range.start) / 60 }, (_, i) => data.range.start + i * 60)
  const y = (minutes: number) => ((minutes - data.range.start) / 60) * HOUR_PX

  const openBooking = (next: BookingDraft) => {
    setDraft(next)
    setDraftVersion((v) => v + 1)
  }

  const label =
    data.view === "week"
      ? `${formatDateKey(data.days[0], { month: "short", day: "numeric" })} to ${formatDateKey(data.days[6], { month: "short", day: "numeric", year: "numeric" })}`
      : formatDateKey(data.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={href({ date: data.todayKey })}>Today</Link>
          </Button>
          <div className="flex">
            <Button asChild variant="ghost" size="icon-sm" aria-label={data.view === "week" ? "Previous week" : "Previous day"}>
              <Link href={href({ date: addDays(data.date, -step) })}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" aria-label={data.view === "week" ? "Next week" : "Next day"}>
              <Link href={href({ date: addDays(data.date, step) })}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted p-1 text-sm">
            {(["day", "week"] as const).map((view) => (
              <Link
                key={view}
                href={href({ view })}
                aria-current={data.view === view ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 font-medium capitalize text-muted-foreground hover:text-foreground",
                  data.view === view && "bg-background text-foreground shadow-sm"
                )}
              >
                {view}
              </Link>
            ))}
          </div>
          {data.view === "week" && (
            <Select value={data.selectedStaffId ?? undefined} onValueChange={(staff) => router.push(href({ staff }))}>
              <SelectTrigger className="w-44" aria-label="Therapist">
                <SelectValue placeholder="Therapist" />
              </SelectTrigger>
              <SelectContent>
                {data.staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() =>
              openBooking({
                mode: "create",
                date: data.date < data.todayKey ? data.todayKey : data.date,
                staff_id: data.view === "week" ? (data.selectedStaffId ?? undefined) : columns[0]?.staffId,
              })
            }
            disabled={options.staff.length === 0}
          >
            <CalendarPlus className="h-4 w-4" />
            New booking
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{live.length}</span> booked
          {" · "}
          <span className="font-medium text-foreground">{formatCurrency(bookedValue)}</span> in services
          {shiftMinutes > 0 && (
            <>
              {" · "}
              <span className="font-medium text-foreground">{Math.round((bookedMinutes / shiftMinutes) * 100)}%</span> of
              therapist hours booked
            </>
          )}
          {offToday.length > 0 && <> · Off today: {offToday.join(", ")}</>}
        </p>
        <div className="flex items-center gap-2">
          <Switch id="show-cancelled" checked={showCancelled} onCheckedChange={setShowCancelled} />
          <Label htmlFor="show-cancelled" className="font-normal">
            Show cancelled
          </Label>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={<CalendarPlus className="h-12 w-12" />}
            title={options.staff.length === 0 ? "No therapists to book" : "Nobody is working"}
            description={
              options.staff.length === 0
                ? "Add therapists and set their working hours to start taking bookings."
                : "No therapists are scheduled on this day. Pick another day or update schedules."
            }
            action={
              options.staff.length === 0
                ? { label: "Invite therapists", href: "/dashboard/settings?tab=team" }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-max">
            {/* Column headers */}
            <div className="sticky top-0 z-20 flex border-b bg-card">
              <div className="w-16 shrink-0" />
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn("min-w-[148px] flex-1 border-l px-2 py-2 text-center", col.isToday && data.view === "week" && "bg-spa-light/50")}
                >
                  <p className="truncate text-sm font-semibold">{col.title}</p>
                  <p className="text-xs text-muted-foreground">{col.subtitle}</p>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="relative flex" style={{ height }}>
              <div className="relative w-16 shrink-0">
                {hours.map((h) => (
                  <span
                    key={h}
                    className={cn("absolute right-2 text-[11px] text-muted-foreground", h === data.range.start ? "translate-y-0.5" : "-translate-y-2")}
                    style={{ top: y(h) }}
                  >
                    {formatMinutes(h).replace(":00", "")}
                  </span>
                ))}
              </div>

              {columns.map((col) => {
                const items = visible.filter((a) => a.staff_id === col.staffId && a.date === col.date)
                const lanes = layoutLanes(items)
                const slots: number[] = []
                if (col.shift && col.date >= data.todayKey) {
                  for (let t = col.shift.start; t + SLOT_MINUTES <= col.shift.end; t += SLOT_MINUTES) {
                    if (col.date === data.todayKey && t < nowMinutes) continue
                    // Only offer slots that no live booking covers
                    const taken = items.some(
                      (a) =>
                        (a.status === "SCHEDULED" || a.status === "COMPLETED" || a.status === "PENDING_DEPOSIT") &&
                        t < a.start + a.duration &&
                        a.start < t + SLOT_MINUTES
                    )
                    if (!taken) slots.push(t)
                  }
                }
                return (
                  <div key={col.key} className="relative min-w-[148px] flex-1 border-l bg-muted/60">
                    {/* Working hours */}
                    {col.shift && (
                      <div
                        className="absolute inset-x-0 bg-background"
                        style={{ top: y(col.shift.start), height: y(col.shift.end) - y(col.shift.start) }}
                      />
                    )}
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-border/70" style={{ top: y(h) }} />
                    ))}
                    {/* Free slots */}
                    {slots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="group absolute inset-x-1 rounded-md text-left text-xs text-spa-accent hover:bg-spa-light/60 focus-visible:bg-spa-light/60 focus-visible:outline-none"
                        style={{ top: y(t) + 1, height: (SLOT_MINUTES / 60) * HOUR_PX - 2 }}
                        aria-label={`Book ${col.title} at ${formatMinutes(t)}`}
                        onClick={() =>
                          openBooking({ mode: "create", staff_id: col.staffId, date: col.date, time: minutesToTime(t) })
                        }
                      >
                        <span className="hidden px-2 py-1 group-hover:inline group-focus-visible:inline">+ {formatMinutes(t)}</span>
                      </button>
                    ))}
                    {/* Appointments */}
                    {items.map((a) => {
                      const lane = lanes.get(a.id) ?? { lane: 0, lanes: 1 }
                      const blockHeight = Math.max((a.duration / 60) * HOUR_PX - 3, 22)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedId(a.id)}
                          className={cn(
                            "absolute z-10 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-colors",
                            STATUS_STYLES[a.status]
                          )}
                          style={{
                            top: y(a.start) + 1,
                            height: blockHeight,
                            left: `calc(${(lane.lane / lane.lanes) * 100}% + 3px)`,
                            width: `calc(${100 / lane.lanes}% - 6px)`,
                          }}
                          aria-label={`${a.client_name}, ${a.service_name}, ${formatMinutes(a.start)}, ${a.status.toLowerCase()}`}
                        >
                          <p className="flex items-center gap-1 font-semibold">
                            <span className="truncate">{a.client_name}</span>
                            {a.status === "PENDING_DEPOSIT" && <Hourglass className="h-3 w-3 shrink-0" aria-label="Awaiting deposit" />}
                            {a.source === "ONLINE" && <Globe className="h-3 w-3 shrink-0" aria-label="Booked online" />}
                            {a.confirmed && a.status === "SCHEDULED" && <CheckCheck className="h-3 w-3 shrink-0" aria-label="Client confirmed" />}
                            {a.paid && <CreditCard className="h-3 w-3 shrink-0" aria-label="Paid" />}
                            {a.location_type === "REMOTE" && <MapPin className="h-3 w-3 shrink-0" aria-label="Mobile visit" />}
                          </p>
                          {blockHeight > 34 && (
                            <p className="truncate opacity-80">
                              {formatMinutes(a.start)} · {a.service_name}
                            </p>
                          )}
                        </button>
                      )
                    })}
                    {/* Now */}
                    {col.isToday && nowMinutes >= data.range.start && nowMinutes <= data.range.end && (
                      <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: y(nowMinutes) }}>
                        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Times shown in {data.timezone.replace(/_/g, " ")}. Click an empty slot to book it, or a booking to check out, reschedule or cancel.
        Dashed amber: booked online, waiting for the deposit.
      </p>

      {draft && (
        <BookingDialog
          key={draftVersion}
          open={!!draft}
          onOpenChange={(open) => {
            if (!open) {
              setDraft(null)
              if (initialBooking) router.replace(href({}))
            }
          }}
          draft={draft}
          options={options}
          timezone={data.timezone}
          todayKey={data.todayKey}
          onBooked={(date) => {
            const inView = data.days.includes(date)
            if (inView) router.refresh()
            else router.push(href({ date }))
          }}
        />
      )}

      <AppointmentSheet
        appointment={selected}
        nowMs={nowMs}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onReschedule={(a) => {
          setSelectedId(null)
          openBooking({
            mode: "reschedule",
            appointmentId: a.id,
            client_id: a.client_id,
            service_id: a.service_id,
            staff_id: a.staff_id,
            date: a.date < data.todayKey ? data.todayKey : a.date,
            time: minutesToTime(a.start),
          })
        }}
        onRebook={(a) => {
          setSelectedId(null)
          openBooking({ mode: "create", client_id: a.client_id, service_id: a.service_id, staff_id: a.staff_id, date: data.todayKey })
        }}
      />
    </div>
  )
}
