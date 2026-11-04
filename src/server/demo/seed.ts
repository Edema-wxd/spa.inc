import "server-only"

import { DEFAULT_BOOKING_SETTINGS, depositFor } from "@/lib/booking"
import { toE164 } from "@/lib/phone"
import {
  addDays,
  dateKeyInZone,
  daysBetween,
  formatDateKey,
  formatInZone,
  minutesToTime,
  monthsBefore,
  weekdayOf,
  zonedTimeToUtc,
  type DateKey,
} from "@/lib/time"
import { renderMessage, REPLIES } from "@/server/services/message-templates"
import type {
  Appointment,
  Client,
  Deposit,
  Expense,
  Location,
  Message,
  Organization,
  Payment,
  PaymentMethod,
  Service,
  StaffSchedule,
  User,
} from "@/types"
import { featuredClients } from "./clients"
import { schedulesSeed } from "./schedules"
import { servicesSeed } from "./services"
import { usersSeed } from "./users"

// ---------------------------------------------------------------------------
// Demo business: a seven-therapist day spa in Austin, TX.
//
// Twelve months of history are simulated day by day from each therapist's
// real working hours, so every number the dashboard shows can be traced back
// to a booking, a payment or an expense. Nothing is hardcoded downstream.
// The business grows from roughly 50% to 70% utilization over the year, pays
// therapists 45% commission, and runs at a healthy but believable margin.
// Output is deterministic for a given "today".
// ---------------------------------------------------------------------------

export const DEMO_TIMEZONE = "America/Chicago"

export interface DemoData {
  users: User[]
  clients: Client[]
  services: Service[]
  appointments: Appointment[]
  payments: Payment[]
  expenses: Expense[]
  schedules: StaffSchedule[]
  locations: Location[]
  organization: Organization
  deposits: Deposit[]
  messages: Message[]
}

export const DEMO_SLUG = "juniper-day-spa"
const BUSINESS_NAME = "Juniper Day Spa"
/** Online booking with a $20 deposit went live this many days ago */
const ONLINE_LAUNCH_DAYS = 120
const DEMO_DEPOSIT_CENTS = 2000

const COMMISSION_RATE = 0.45
const CARD_FEE_RATE = 0.0275
const HISTORY_MONTHS = 12
const BOOKED_AHEAD_DAYS = 21
const TOTAL_CLIENTS = 490

/** Small seeded PRNG (mulberry32) so the demo is stable between restarts. */
function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    weighted: <T,>(items: readonly T[], weight: (item: T) => number) => {
      const total = items.reduce((sum, item) => sum + weight(item), 0)
      let roll = next() * total
      for (const item of items) {
        roll -= weight(item)
        if (roll <= 0) return item
      }
      return items[items.length - 1]
    },
  }
}

type Random = ReturnType<typeof createRandom>

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Ava", "Liam", "Mia", "Noah", "Isabella", "Lucas", "Amara", "Mateo", "Chloe", "Elijah",
  "Zoe", "Daniel", "Priya", "Samuel", "Grace", "Oliver", "Leah", "Henry", "Nora", "Jack",
  "Fatima", "Leo", "Hannah", "Gabriel", "Aaliyah", "Owen", "Camila", "Wyatt", "Layla", "Isaac",
  "Chiamaka", "Julian", "Maya", "Caleb", "Stella", "Aaron", "Lucy", "Ezra", "Ivy", "Adrian",
  "Naomi", "Miles", "Ruby", "Jonah", "Sadie", "Kai", "Elena", "Theo", "Alice", "Tunde",
  "Rosa", "Vikram", "Harper", "Diego", "Mei", "Marcus", "Bianca", "Andre", "Keisha", "Hugo",
]

const LAST_NAMES = [
  "Nguyen", "Garcia", "Smith", "Okonkwo", "Patel", "Kim", "Rodriguez", "Brown", "Hernandez", "Lee",
  "Walker", "Adeyemi", "Lopez", "Wilson", "Clark", "Ramirez", "Lewis", "Young", "Allen", "Sanchez",
  "Wright", "Scott", "Torres", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
  "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Cox",
]

const CLIENT_NOTES = [
  "", "", "", "", "", "",
  "Prefers firm pressure on shoulders and neck.",
  "Sensitive to strong scents, use unscented oil.",
  "Desk job, recurring lower back tension.",
  "Training for a marathon, likes sports massage before long runs.",
  "Prefers a quiet session with minimal conversation.",
  "Allergic to nut oils. Use grapeseed or jojoba only.",
  "Likes the room warm and an extra blanket.",
  "Old knee injury on the left side, avoid deep work there.",
  "Books for special occasions, often buys gift cards.",
  "Prefers early morning appointments.",
  "Pregnant, second trimester. Side-lying position.",
  "Responds well to hot stones on the upper back.",
]

type Loyalty = "weekly" | "regular" | "occasional" | "once"

interface ClientProfile {
  client: Client
  joinedOn: DateKey
  /** Last day this client still books (lapsed clients stop earlier) */
  activeUntil: DateKey
  loyalty: Loyalty
  favoriteServiceId: string
  favoriteStaffId: string
}

/** Minimum days between visits for each kind of client */
const MIN_GAP_DAYS: Record<Loyalty, number> = {
  weekly: 5,
  regular: 10,
  occasional: 24,
  once: 0,
}

const LOYALTY_WEIGHT: Record<Loyalty, number> = {
  weekly: 9,
  regular: 3.2,
  occasional: 1,
  once: 0.35,
}

function buildClients(rng: Random, startKey: DateKey, todayKey: DateKey, staffIds: string[], services: Service[]) {
  const profiles: ClientProfile[] = []
  const usedNames = new Set(featuredClients.map((c) => c.full_name))
  const historyDays = daysBetween(startKey, todayKey)

  const profileFor = (client: Client, joinedOn: DateKey): ClientProfile => {
    const roll = rng.next()
    const loyalty: Loyalty =
      roll < 0.15 ? "weekly" : roll < 0.56 ? "regular" : roll < 0.86 ? "occasional" : "once"
    const lapses = loyalty !== "weekly" && rng.chance(0.16)
    const activeUntil = lapses ? addDays(todayKey, -rng.int(100, 220)) : addDays(todayKey, 365)
    return {
      client,
      joinedOn,
      activeUntil,
      loyalty,
      favoriteServiceId: rng.weighted(services, (s) => SERVICE_POPULARITY[s.id] ?? 1).id,
      favoriteStaffId: rng.pick(staffIds),
    }
  }

  for (const client of featuredClients) {
    profiles.push(profileFor(structuredClone(client), startKey))
  }

  let index = featuredClients.length
  while (profiles.length < TOTAL_CLIENTS) {
    const first = rng.pick(FIRST_NAMES)
    const last = rng.pick(LAST_NAMES)
    const name = `${first} ${last}`
    if (usedNames.has(name)) continue
    usedNames.add(name)
    index += 1

    // Over half of the book predates the history window; newer clients
    // join steadily, slightly faster in recent months (the spa is growing).
    const joinedOn = rng.chance(0.58)
      ? addDays(startKey, -rng.int(30, 500))
      : addDays(startKey, Math.floor(Math.sqrt(rng.next()) * (historyDays - 2)))
    const created = zonedTimeToUtc(joinedOn, `${rng.int(9, 18)}:${rng.pick(["00", "15", "30", "45"])}`, DEMO_TIMEZONE)

    const client: Client = {
      id: `client-${String(index).padStart(3, "0")}`,
      full_name: name,
      email: rng.chance(0.88) ? `${first}.${last}${rng.int(1, 99)}@example.com`.toLowerCase() : "",
      phone: `512555${String(rng.int(1000, 9999))}`,
      date_of_birth: rng.chance(0.6)
        ? `${rng.int(1962, 2003)}-${String(rng.int(1, 12)).padStart(2, "0")}-${String(rng.int(1, 28)).padStart(2, "0")}`
        : "",
      address: rng.chance(0.5) ? `${rng.int(100, 9800)} ${rng.pick(STREETS)}, Austin, TX ${rng.pick(ZIPS)}` : "",
      notes: rng.pick(CLIENT_NOTES),
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
    }
    profiles.push(profileFor(client, joinedOn))
  }
  return profiles
}

const STREETS = ["Elm Street", "Lamar Blvd", "Congress Ave", "Riverside Dr", "Burnet Rd", "Oak Hill Dr", "Cesar Chavez St", "Manor Rd"]
const ZIPS = ["78701", "78702", "78703", "78704", "78705", "78745", "78751", "78756"]

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

const SERVICE_POPULARITY: Record<string, number> = {
  "svc-001": 18, // Swedish
  "svc-002": 20, // Deep tissue
  "svc-003": 8, // Hot stone
  "svc-004": 10, // Aromatherapy
  "svc-005": 8, // Sports
  "svc-006": 3, // Prenatal
  "svc-007": 7, // Reflexology
  "svc-008": 3, // Couples
  "svc-009": 6, // Thai
  "svc-010": 6, // Express chair
}

/** Some therapists are booked more than others, which makes the leaderboard meaningful. */
const STAFF_DEMAND: Record<string, number> = {
  "staff-001": 1.12,
  "staff-002": 1.04,
  "staff-003": 1.08,
  "staff-004": 0.9,
  "staff-005": 0.98,
  "staff-006": 0.88,
  "staff-007": 1.0,
}

const MOBILE_STAFF = new Set(["staff-004", "staff-006"])

const REMOTE_NOTES = [
  "Client home - Travis Heights",
  "Hotel Van Zandt, room booked under client name",
  "Corporate wellness day - East 6th office",
  "Client home - Mueller",
  "Client residence - Zilker",
]

const APPOINTMENT_NOTES = [
  "", "", "", "", "", "", "", "",
  "Extra focus on shoulders",
  "Follow-up from last session, tension much improved",
  "First visit, intake form completed",
  "Client arrived 10 minutes late, shortened session",
  "Used heated towels per client request",
  "Adjusted pressure mid-session per feedback",
  "Recommended rebooking in two weeks",
]

const BUFFER_MINUTES = 15
const SLOT_MINUTES = 15

function buildAppointments(
  rng: Random,
  startKey: DateKey,
  todayKey: DateKey,
  now: Date,
  staff: User[],
  schedules: StaffSchedule[],
  services: Service[],
  clients: ClientProfile[]
) {
  const appointments: Appointment[] = []
  const serviceById = new Map(services.map((s) => [s.id, s]))
  const shortServices = services.filter((s) => s.default_duration_minutes <= 45)
  const historyDays = daysBetween(startKey, todayKey)
  const endKey = addDays(todayKey, BOOKED_AHEAD_DAYS)
  const lastVisit = new Map<string, number>()
  const launch = zonedTimeToUtc(addDays(todayKey, -ONLINE_LAUNCH_DAYS), "09:00", DEMO_TIMEZONE).getTime()
  let seq = 0

  for (let key = startKey; key <= endKey; key = addDays(key, 1)) {
    const weekday = weekdayOf(key)
    const offset = daysBetween(todayKey, key)
    const progress = Math.min(1, daysBetween(startKey, key) / historyDays)
    // Utilization grows over the year; Saturdays are busiest, Mondays quietest
    let demand = 0.5 + 0.2 * progress
    if (weekday === 6) demand += 0.12
    if (weekday === 1) demand -= 0.06
    const month = Number(key.slice(5, 7))
    if (month === 12) demand += 0.05
    if (month === 1) demand -= 0.05
    // Future days are only partly booked so far
    if (offset > 0) demand *= Math.max(0.1, 0.92 * Math.exp(-offset / 7))

    // Who could book today: joined, not lapsed, and past their usual gap since the last visit
    const dayIndex = daysBetween(startKey, key)
    const eligible: { profile: ClientProfile; weight: number }[] = []
    for (const c of clients) {
      if (c.joinedOn > key || c.activeUntil < key) continue
      const last = lastVisit.get(c.client.id)
      if (last !== undefined && dayIndex - last < MIN_GAP_DAYS[c.loyalty]) continue
      if (c.loyalty === "once" && last !== undefined) continue
      let weight = LOYALTY_WEIGHT[c.loyalty]
      // Brand new clients book their first visit soon after joining
      if (last === undefined && daysBetween(c.joinedOn, key) < 14) weight *= 2.5
      eligible.push({ profile: c, weight })
    }
    const bookedToday = new Set<string>()

    for (const member of staff) {
      const shift = schedules.find((s) => s.staff_id === member.id && s.day_of_week === weekday && s.is_available)
      if (!shift) continue
      // Occasional sick days and holidays in the past
      if (offset < 0 && rng.chance(0.035)) continue

      const shiftStart = toMinutes(shift.start_time)
      const shiftEnd = toMinutes(shift.end_time)
      const rate = Math.min(0.95, demand * (STAFF_DEMAND[member.id] ?? 1))
      let t = shiftStart

      while (t + 30 <= shiftEnd) {
        if (!rng.chance(rate)) {
          t += 30
          continue
        }
        let service = serviceById.get(rng.weighted(services, (s) => SERVICE_POPULARITY[s.id] ?? 1).id)!
        if (t + service.default_duration_minutes > shiftEnd) {
          const fits = shortServices.filter((s) => t + s.default_duration_minutes <= shiftEnd)
          if (fits.length === 0) break
          service = rng.pick(fits)
        }

        const candidates = eligible.filter((e) => !bookedToday.has(e.profile.client.id))
        if (candidates.length === 0) break
        const { profile } = rng.weighted(candidates, (e) => {
          let w = e.weight
          if (e.profile.favoriteStaffId === member.id) w *= 3
          if (e.profile.favoriteServiceId === service.id) w *= 1.5
          return w
        })
        bookedToday.add(profile.client.id)
        if (offset <= 0) lastVisit.set(profile.client.id, dayIndex)

        const duration = service.default_duration_minutes
        const start = zonedTimeToUtc(key, minutesToTime(t), DEMO_TIMEZONE)
        const end = new Date(start.getTime() + duration * 60_000)
        const remote = MOBILE_STAFF.has(member.id) && rng.chance(0.3)

        const leadDays = rng.int(0, 16)
        const createdAt = new Date(Math.min(now.getTime(), start.getTime() - leadDays * 86_400_000 - rng.int(1, 600) * 60_000))

        // After launch, a growing share of clients book themselves online and pay a deposit
        const sinceLaunch = createdAt.getTime() - launch
        const online = sinceLaunch >= 0 && rng.chance(0.25 + 0.2 * Math.min(1, sinceLaunch / (now.getTime() - launch)))

        // Deposits cut no-shows: about 1% online vs 3.5% for bookings without one
        let status: Appointment["status"] = "SCHEDULED"
        const roll = rng.next()
        if (end <= now) {
          const cancelled = online ? 0.05 : 0.06
          const noShow = cancelled + (online ? 0.01 : 0.035)
          status = roll < cancelled ? "CANCELLED" : roll < noShow ? "NO_SHOW" : "COMPLETED"
        } else if (roll < 0.03) {
          status = "CANCELLED"
        }

        // Day-before WhatsApp reminders started with online booking
        const reminderAt = start.getTime() - 24 * 3_600_000
        const reminded =
          reminderAt >= launch && reminderAt <= now.getTime() && reminderAt > createdAt.getTime() && status !== "CANCELLED"
        const confirmedAt = reminded && rng.chance(0.45) ? reminderAt + rng.int(5, 240) * 60_000 : null

        seq += 1
        appointments.push({
          id: `apt-${String(seq).padStart(5, "0")}`,
          client_id: profile.client.id,
          staff_id: member.id,
          service_id: service.id,
          scheduled_at: start.toISOString(),
          duration_minutes: duration,
          status,
          location_type: remote ? "REMOTE" : "IN_SPA",
          location_notes: remote ? rng.pick(REMOTE_NOTES) : "",
          satisfaction_rating: status === "COMPLETED" && rng.chance(0.55) ? pickRating(rng) : null,
          notes: rng.pick(APPOINTMENT_NOTES),
          source: online ? "ONLINE" : "DASHBOARD",
          hold_expires_at: null,
          confirmed_at: confirmedAt !== null && confirmedAt <= now.getTime() ? new Date(confirmedAt).toISOString() : null,
          reminder_sent_at: reminded ? new Date(reminderAt).toISOString() : null,
          manage_token: sinceLaunch >= 0 ? token(rng) : null,
          created_at: createdAt.toISOString(),
          updated_at: (status === "SCHEDULED" ? createdAt : end).toISOString(),
        })
        t += duration + BUFFER_MINUTES
        t = Math.ceil(t / SLOT_MINUTES) * SLOT_MINUTES
      }
    }
  }
  return appointments
}

function token(rng: Random) {
  return Array.from({ length: 24 }, () => rng.int(0, 15).toString(16)).join("")
}

function pickRating(rng: Random) {
  const roll = rng.next()
  return roll < 0.62 ? 5 : roll < 0.92 ? 4 : roll < 0.99 ? 3 : 2
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

function pickMethod(rng: Random): PaymentMethod {
  const roll = rng.next()
  return roll < 0.58 ? "CARD" : roll < 0.78 ? "TRANSFER" : roll < 0.95 ? "CASH" : "OTHER"
}

function buildPayments(rng: Random, appointments: Appointment[], services: Service[], todayKey: DateKey) {
  const price = new Map(services.map((s) => [s.id, s.default_price]))
  const payments: Payment[] = []
  const deposits: Deposit[] = []
  let seq = 0
  let depositSeq = 0

  for (const apt of appointments) {
    const dateKey = dateKeyInZone(apt.scheduled_at, DEMO_TIMEZONE)
    const end = new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60_000).toISOString()

    // Online bookings paid a deposit when they booked; it comes off the bill
    let depositPaid = 0
    if (apt.source === "ONLINE") {
      depositPaid = depositFor(price.get(apt.service_id) ?? 0, { deposit_type: "FIXED", deposit_value: DEMO_DEPOSIT_CENTS })
      // Cancellations with enough notice were refunded; late ones and no-shows kept the deposit
      const refunded = apt.status === "CANCELLED" && rng.chance(0.75)
      const kept = apt.status === "NO_SHOW" || (apt.status === "CANCELLED" && !refunded)
      seq += 1
      const paymentId = `pay-${String(seq).padStart(5, "0")}`
      payments.push({
        id: paymentId,
        appointment_id: apt.id,
        client_id: apt.client_id,
        staff_id: apt.staff_id,
        amount: depositPaid,
        payment_method: "CARD",
        payment_date: dateKeyInZone(apt.created_at, DEMO_TIMEZONE),
        status: refunded ? "REFUNDED" : "COMPLETED",
        reference_note: refunded ? "Online deposit (refunded)" : kept ? "Online deposit (kept)" : "Online deposit",
        created_at: apt.created_at,
        updated_at: refunded || kept ? apt.updated_at : apt.created_at,
      })
      depositSeq += 1
      deposits.push({
        id: `dep-${String(depositSeq).padStart(5, "0")}`,
        appointment_id: apt.id,
        client_id: apt.client_id,
        amount: depositPaid,
        currency: "USD",
        provider: "DEMO",
        status: refunded ? "REFUNDED" : kept ? "FORFEITED" : "PAID",
        provider_reference: `demo_${apt.id}`,
        checkout_url: null,
        payment_id: paymentId,
        paid_at: apt.created_at,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
      })
      if (refunded) depositPaid = 0
    }

    if (apt.status === "COMPLETED") {
      let amount = (price.get(apt.service_id) ?? 0) - depositPaid
      let note = ""
      if (rng.chance(0.07)) {
        amount += rng.pick([1500, 2000, 2500])
        note = rng.pick(["Added scalp treatment", "Upgraded to CBD oil", "Added hot towel foot ritual"])
      }
      const recent = daysBetween(dateKey, todayKey) <= 2
      const status: Payment["status"] = recent && rng.chance(0.04) ? "PENDING" : rng.chance(0.006) ? "REFUNDED" : "COMPLETED"
      seq += 1
      payments.push({
        id: `pay-${String(seq).padStart(5, "0")}`,
        appointment_id: apt.id,
        client_id: apt.client_id,
        staff_id: apt.staff_id,
        amount,
        payment_method: pickMethod(rng),
        payment_date: dateKey,
        status,
        reference_note: status === "REFUNDED" ? "Refunded at manager discretion" : note,
        created_at: end,
        updated_at: end,
      })
    } else if (apt.status === "NO_SHOW" && apt.source === "DASHBOARD" && rng.chance(0.4)) {
      seq += 1
      payments.push({
        id: `pay-${String(seq).padStart(5, "0")}`,
        appointment_id: apt.id,
        client_id: apt.client_id,
        staff_id: apt.staff_id,
        amount: 2500,
        payment_method: "CARD",
        payment_date: dateKey,
        status: "COMPLETED",
        reference_note: "No-show fee",
        created_at: end,
        updated_at: end,
      })
    }
  }
  return { payments, deposits }
}

// ---------------------------------------------------------------------------
// Messages: the last week of confirmations, reminders and replies
// ---------------------------------------------------------------------------

function buildMessages(
  appointments: Appointment[],
  clients: Client[],
  users: User[],
  services: Service[],
  now: Date
) {
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const userById = new Map(users.map((u) => [u.id, u]))
  const serviceById = new Map(services.map((s) => [s.id, s]))
  const base = process.env.APP_URL ?? "http://localhost:3000"
  const since = now.getTime() - 7 * 86_400_000
  const messages: Message[] = []
  let seq = 0
  const push = (m: Omit<Message, "id">) => {
    seq += 1
    messages.push({ id: `msg-${String(seq).padStart(5, "0")}`, ...m })
  }

  for (const apt of appointments) {
    const start = Date.parse(apt.scheduled_at)
    if (start < since || start > now.getTime() + 3 * 86_400_000) continue
    const client = clientById.get(apt.client_id)
    if (!client?.phone) continue
    const to = toE164(client.phone, "US")
    const vars = {
      first_name: client.full_name.split(" ")[0],
      business: BUSINESS_NAME,
      service: serviceById.get(apt.service_id)?.name ?? "your appointment",
      staff: userById.get(apt.staff_id)?.full_name.split(" ")[0] ?? "your therapist",
      date: formatInZone(apt.scheduled_at, DEMO_TIMEZONE, { weekday: "short", month: "short", day: "numeric" }),
      time: formatInZone(apt.scheduled_at, DEMO_TIMEZONE, { hour: "numeric", minute: "2-digit" }),
      when: "tomorrow",
      link: apt.manage_token ? `${base}/book/${DEMO_SLUG}/booking/${apt.manage_token}` : `${base}/book/${DEMO_SLUG}`,
    }
    const common = { appointment_id: apt.id, client_id: client.id, channel: "WHATSAPP" as const, to, provider_message_id: null, error: null }

    if (apt.source === "ONLINE" && Date.parse(apt.created_at) >= since) {
      push({ ...common, kind: "BOOKING_CONFIRMATION", direction: "OUTBOUND", status: "SIMULATED", body: renderMessage("BOOKING_CONFIRMATION", vars).body, created_at: apt.created_at })
    }
    if (apt.reminder_sent_at && Date.parse(apt.reminder_sent_at) >= since) {
      push({ ...common, kind: "REMINDER", direction: "OUTBOUND", status: "SIMULATED", body: renderMessage("REMINDER", vars).body, created_at: apt.reminder_sent_at })
      if (apt.confirmed_at) {
        push({ ...common, kind: "REPLY", direction: "INBOUND", status: "RECEIVED", body: "1", created_at: apt.confirmed_at })
        push({ ...common, kind: "REPLY", direction: "OUTBOUND", status: "SIMULATED", body: REPLIES.confirmed(vars), created_at: new Date(Date.parse(apt.confirmed_at) + 2000).toISOString() })
      }
    }
  }
  return messages
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

function buildExpenses(rng: Random, startKey: DateKey, todayKey: DateKey, payments: Payment[], staff: User[]) {
  const expenses: Expense[] = []
  let seq = 0
  const add = (
    key: DateKey,
    category: Expense["category"],
    description: string,
    amount: number,
    recurrence: Expense["recurrence_interval"] = null,
    createdBy = "admin-001"
  ) => {
    if (key < startKey || key > todayKey || amount <= 0) return
    const created = zonedTimeToUtc(key, "18:00", DEMO_TIMEZONE).toISOString()
    seq += 1
    expenses.push({
      id: `exp-${String(seq).padStart(4, "0")}`,
      category,
      description,
      amount: Math.round(amount),
      expense_date: key,
      is_recurring: recurrence !== null,
      recurrence_interval: recurrence,
      receipt_url: null,
      created_by: createdBy,
      created_at: created,
      updated_at: created,
    })
  }

  // Monthly fixed costs
  for (let month = startKey; month <= todayKey; month = monthsBefore(month, -1)) {
    const ym = month.slice(0, 7)
    const day = (d: number) => `${ym}-${String(d).padStart(2, "0")}`
    add(day(1), "RENT", "Monthly lease - 1100 S Lamar Blvd", 850000, "MONTHLY")
    add(day(1), "OTHER", "Business liability insurance", 42000, "MONTHLY")
    add(day(6), "UTILITIES", "Electricity and water - Austin Energy", rng.int(105000, 152000), "MONTHLY")
    add(day(8), "UTILITIES", "Internet and phone line", 18900, "MONTHLY")
    add(day(10), "OTHER", "Bookkeeping and payroll service", 35000, "MONTHLY")
    add(day(12), "MARKETING", rng.pick(["Instagram and Google ads", "Google ads and local SEO", "Instagram promotion"]), rng.int(90000, 160000))
    add(day(28), "PAYROLL", "Salary - Michael Reyes (front desk)", 420000, "MONTHLY")

    // Card processing for the previous month, charged on the 2nd
    const prevMonth = monthsBefore(month, 1).slice(0, 7)
    const cardTotal = payments
      .filter((p) => p.status === "COMPLETED" && p.payment_method === "CARD" && p.payment_date.startsWith(prevMonth))
      .reduce((sum, p) => sum + p.amount, 0)
    add(day(2), "OTHER", `Card processing fees - ${formatDateKey(`${prevMonth}-01`, { month: "long" })}`, cardTotal * CARD_FEE_RATE, "MONTHLY")
  }

  // Weekly supplies and linen service
  for (let key = startKey; key <= todayKey; key = addDays(key, 1)) {
    const weekday = weekdayOf(key)
    if (weekday === 1) add(key, "SUPPLIES", "Massage oils, lotions and disposables", rng.int(32000, 61000), null, "admin-002")
    if (weekday === 4) add(key, "SUPPLIES", "Linen and towel service", 22000, "WEEKLY", "admin-002")
  }

  // Equipment every five to seven weeks
  for (let key = addDays(startKey, rng.int(10, 30)); key <= todayKey; key = addDays(key, rng.int(35, 50))) {
    add(
      key,
      "EQUIPMENT",
      rng.pick(["Replacement massage table", "Hot stone heater", "Towel warmer cabinet", "Adjustable face cradles", "Diffusers and speakers"]),
      rng.int(45000, 180000)
    )
  }

  // Semi-monthly commission payroll: the 1st-15th is paid on the 20th, the
  // 16th-month end is paid on the 5th of the following month.
  const revenueByStaffDay = new Map<string, number>()
  for (const p of payments) {
    if (p.status !== "COMPLETED") continue
    const k = `${p.staff_id}|${p.payment_date}`
    revenueByStaffDay.set(k, (revenueByStaffDay.get(k) ?? 0) + p.amount)
  }
  const payCommission = (payday: DateKey, periodStart: DateKey, periodEnd: DateKey) => {
    const label = `${formatDateKey(periodStart, { month: "short", day: "numeric" })} to ${formatDateKey(periodEnd, { month: "short", day: "numeric" })}`
    for (const member of staff) {
      let revenue = 0
      for (let k = periodStart; k <= periodEnd; k = addDays(k, 1)) revenue += revenueByStaffDay.get(`${member.id}|${k}`) ?? 0
      add(payday, "PAYROLL", `Commission - ${member.full_name} (${label})`, revenue * COMMISSION_RATE)
    }
  }
  for (let month = monthsBefore(startKey, 1); month <= todayKey; month = monthsBefore(month, -1)) {
    const ym = month.slice(0, 7)
    const nextMonth = monthsBefore(month, -1)
    payCommission(`${ym}-20`, `${ym}-01`, `${ym}-15`)
    payCommission(`${nextMonth.slice(0, 7)}-05`, `${ym}-16`, addDays(nextMonth, -1))
  }

  return expenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date))
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildDemoData(now = new Date()): DemoData {
  const rng = createRandom(20240115)
  const todayKey = dateKeyInZone(now, DEMO_TIMEZONE)
  const startKey = monthsBefore(todayKey, HISTORY_MONTHS)

  const users = structuredClone(usersSeed)
  const services = structuredClone(servicesSeed)
  const schedules = structuredClone(schedulesSeed)
  const therapists = users.filter((u) => u.role === "STAFF" && u.is_active)

  const clientProfiles = buildClients(rng, startKey, todayKey, therapists.map((s) => s.id), services)
  const appointments = buildAppointments(rng, startKey, todayKey, now, therapists, schedules, services, clientProfiles)
  const { payments, deposits } = buildPayments(rng, appointments, services, todayKey)
  const expenses = buildExpenses(rng, startKey, todayKey, payments, therapists)
  const clients = clientProfiles.map((p) => p.client)
  const messages = buildMessages(appointments, clients, users, services, now)

  return {
    users,
    clients,
    services,
    appointments: appointments.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    payments: payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    expenses,
    schedules,
    locations: [demoLocation()],
    organization: demoOrganization({
      deposit_type: "FIXED",
      deposit_value: DEMO_DEPOSIT_CENTS,
      welcome_message: "Massage and bodywork on South Lamar. Book in under a minute, pay a small deposit, and get a WhatsApp reminder the day before.",
    }),
    deposits,
    messages,
  }
}

function demoOrganization(booking: Partial<Organization["booking"]> = {}): Organization {
  return {
    id: "org-demo",
    name: BUSINESS_NAME,
    slug: DEMO_SLUG,
    country_code: "US",
    currency: "USD",
    booking: { ...DEFAULT_BOOKING_SETTINGS, ...booking },
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2024-01-15T09:00:00Z",
  }
}

function demoLocation(): Location {
  return {
    id: "loc-main",
    name: BUSINESS_NAME,
    address: "1100 S Lamar Blvd, Austin, TX 78704",
    phone: "5125550100",
    timezone: DEMO_TIMEZONE,
    is_active: true,
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2024-01-15T09:00:00Z",
  }
}

/** Starting point for NEXT_PUBLIC_DEMO_EMPTY=true: just the signed-in owner and one location. */
export function buildEmptyData(): DemoData {
  const owner = structuredClone(usersSeed.filter((u) => u.id === "admin-001"))
  return {
    users: owner,
    clients: [],
    services: [],
    appointments: [],
    payments: [],
    expenses: [],
    schedules: [],
    locations: [demoLocation()],
    organization: demoOrganization(),
    deposits: [],
    messages: [],
  }
}
