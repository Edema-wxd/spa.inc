import "server-only"

import { buildDemoData, buildEmptyData } from "@/server/demo/seed"
import { normalizePhone, phoneDigits, phoneMatchKey } from "@/lib/phone"
import type {
  Appointment,
  Client,
  Deposit,
  Expense,
  Location,
  Message,
  Organization,
  Payment,
  SalesLead,
  Service,
  StaffSchedule,
  User,
} from "@/types"
import { DEMO_ORGANIZATION_ID } from "@/server/context"
import type { DateRange, Repositories } from "@/server/repositories/types"

// In-process store, one bucket per organization. Lives on globalThis so it
// survives dev hot reloads. Data resets when the server restarts, and is not
// shared between serverless instances; use DATA_SOURCE=prisma for real data.

interface OrgStore {
  clients: Client[]
  users: User[]
  services: Service[]
  appointments: Appointment[]
  payments: Payment[]
  expenses: Expense[]
  schedules: StaffSchedule[]
  locations: Location[]
  organization: Organization | null
  deposits: Deposit[]
  messages: Message[]
}

interface MemoryDb {
  orgs: Map<string, OrgStore>
  salesLeads: SalesLead[]
}

const globalForDb = globalThis as unknown as { __spaMemoryDb?: MemoryDb }

function now() {
  return new Date().toISOString()
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/** NEXT_PUBLIC_DEMO_EMPTY=true starts with no business data, to preview empty states. */
const DEMO_EMPTY = process.env.NEXT_PUBLIC_DEMO_EMPTY === "true"

function seededStore(): OrgStore {
  return DEMO_EMPTY ? buildEmptyData() : buildDemoData()
}

function emptyStore(): OrgStore {
  return {
    clients: [],
    users: [],
    services: [],
    appointments: [],
    payments: [],
    expenses: [],
    schedules: [],
    locations: [],
    organization: null,
    deposits: [],
    messages: [],
  }
}

function db(): MemoryDb {
  globalForDb.__spaMemoryDb ??= {
    orgs: new Map([[DEMO_ORGANIZATION_ID, seededStore()]]),
    salesLeads: [],
  }
  return globalForDb.__spaMemoryDb
}

function org(orgId: string): OrgStore {
  const orgs = db().orgs
  if (!orgs.has(orgId)) orgs.set(orgId, emptyStore())
  return orgs.get(orgId)!
}

function inRange(dateIso: string, range: DateRange) {
  const day = dateIso.slice(0, 10)
  return (!range.from || day >= range.from) && (!range.to || day <= range.to)
}

/** Updates the stored row and returns a copy (callers must never hold live rows). */
function patch<T extends object>(item: T, input: object): T {
  const defined = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  return structuredClone(Object.assign(item, defined, { updated_at: now() }))
}

/** A copy of a stored row, or null. */
function copy<T>(item: T | undefined): T | null {
  return item ? structuredClone(item) : null
}

export const memoryRepositories: Repositories = {
  clients: {
    async list(orgId, filter) {
      const search = filter?.search?.toLowerCase()
      // Phone search ignores formatting: "555 0141" finds "(512) 555-0141"
      const digits = search ? phoneDigits(search) : ""
      return org(orgId).clients.filter(
        (c) =>
          !search ||
          c.full_name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          (digits.length >= 3 && phoneDigits(c.phone).includes(digits))
      )
    },
    async get(orgId, id) {
      return copy(org(orgId).clients.find((c) => c.id === id))
    },
    async count(orgId) {
      return org(orgId).clients.length
    },
    async findByPhone(orgId, phone) {
      const key = phoneMatchKey(phone)
      if (key.length < 7) return null
      return copy(org(orgId).clients.find((c) => c.phone && phoneMatchKey(c.phone) === key))
    },
    async create(orgId, input) {
      const client: Client = {
        id: newId("client"),
        full_name: input.full_name,
        email: input.email ?? "",
        phone: normalizePhone(input.phone),
        date_of_birth: input.date_of_birth ?? "",
        address: input.address ?? "",
        notes: input.notes ?? "",
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).clients.push(client)
      return client
    },
    async update(orgId, id, input) {
      const client = org(orgId).clients.find((c) => c.id === id)
      return client ? patch(client, input.phone ? { ...input, phone: normalizePhone(input.phone) } : input) : null
    },
    async delete(orgId, id) {
      const store = org(orgId)
      const before = store.clients.length
      store.clients = store.clients.filter((c) => c.id !== id)
      return store.clients.length < before
    },
  },

  users: {
    async list(orgId, filter) {
      return org(orgId).users.filter(
        (u) =>
          (!filter?.role || u.role === filter.role) && (!filter?.activeOnly || u.is_active)
      )
    },
    async get(orgId, id) {
      return copy(org(orgId).users.find((u) => u.id === id))
    },
    async count(orgId, filter) {
      return (await this.list(orgId, filter)).length
    },
    async create(orgId, input) {
      const user: User = {
        id: newId(input.role === "ADMIN" ? "admin" : "staff"),
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        phone: input.phone ?? "",
        avatar_url: "",
        is_active: true,
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).users.push(user)
      return user
    },
    async update(orgId, id, input) {
      const user = org(orgId).users.find((u) => u.id === id)
      return user ? patch(user, input) : null
    },
  },

  services: {
    async list(orgId) {
      return org(orgId).services
    },
    async get(orgId, id) {
      return copy(org(orgId).services.find((s) => s.id === id))
    },
  },

  appointments: {
    async list(orgId, filter = {}) {
      return org(orgId).appointments.filter(
        (a) =>
          (!filter.clientId || a.client_id === filter.clientId) &&
          (!filter.staffId || a.staff_id === filter.staffId) &&
          (!filter.status || a.status === filter.status) &&
          inRange(a.scheduled_at, filter)
      )
    },
    async get(orgId, id) {
      return copy(org(orgId).appointments.find((a) => a.id === id))
    },
    async getByManageToken(orgId, token) {
      return copy(org(orgId).appointments.find((a) => a.manage_token === token))
    },
    async create(orgId, input) {
      const appointment: Appointment = {
        id: newId("apt"),
        client_id: input.client_id,
        staff_id: input.staff_id,
        service_id: input.service_id,
        scheduled_at: input.scheduled_at,
        duration_minutes: input.duration_minutes,
        status: input.status ?? "SCHEDULED",
        location_type: input.location_type,
        location_notes: input.location_notes ?? "",
        satisfaction_rating: null,
        notes: input.notes ?? "",
        source: input.source ?? "DASHBOARD",
        hold_expires_at: input.hold_expires_at ?? null,
        confirmed_at: input.confirmed_at ?? null,
        reminder_sent_at: input.reminder_sent_at ?? null,
        manage_token: input.manage_token ?? null,
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).appointments.push(appointment)
      return appointment
    },
    async update(orgId, id, input) {
      const appointment = org(orgId).appointments.find((a) => a.id === id)
      return appointment ? patch(appointment, input) : null
    },
  },

  payments: {
    async get(orgId, id) {
      return copy(org(orgId).payments.find((p) => p.id === id))
    },
    async update(orgId, id, input) {
      const payment = org(orgId).payments.find((p) => p.id === id)
      return payment ? patch(payment, input) : null
    },
    async list(orgId, filter = {}) {
      return org(orgId).payments.filter(
        (p) =>
          (!filter.clientId || p.client_id === filter.clientId) &&
          (!filter.staffId || p.staff_id === filter.staffId) &&
          inRange(p.payment_date, filter)
      )
    },
    async create(orgId, input) {
      const payment: Payment = {
        id: newId("pay"),
        appointment_id: input.appointment_id ?? null,
        client_id: input.client_id,
        staff_id: input.staff_id,
        amount: input.amount,
        payment_method: input.payment_method,
        payment_date: input.payment_date,
        status: input.status ?? "COMPLETED",
        reference_note: input.reference_note ?? "",
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).payments.push(payment)
      return payment
    },
  },

  expenses: {
    async list(orgId, filter = {}) {
      return org(orgId).expenses.filter((e) => inRange(e.expense_date, filter))
    },
    async get(orgId, id) {
      return copy(org(orgId).expenses.find((e) => e.id === id))
    },
    async create(orgId, input) {
      const expense: Expense = {
        id: newId("exp"),
        category: input.category,
        description: input.description,
        amount: input.amount,
        expense_date: input.expense_date,
        is_recurring: input.is_recurring,
        recurrence_interval: input.is_recurring ? (input.recurrence_interval ?? null) : null,
        receipt_url: null,
        created_by: input.created_by,
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).expenses.push(expense)
      return expense
    },
    async update(orgId, id, input) {
      const expense = org(orgId).expenses.find((e) => e.id === id)
      return expense ? patch(expense, input) : null
    },
    async delete(orgId, id) {
      const store = org(orgId)
      const before = store.expenses.length
      store.expenses = store.expenses.filter((e) => e.id !== id)
      return store.expenses.length < before
    },
  },

  schedules: {
    async listForStaff(orgId, staffId) {
      return org(orgId).schedules.filter((s) => s.staff_id === staffId)
    },
    async replaceForStaff(orgId, staffId, items) {
      const store = org(orgId)
      const next: StaffSchedule[] = items.map((item) => ({
        id: newId("sched"),
        staff_id: staffId,
        ...item,
        created_at: now(),
        updated_at: now(),
      }))
      store.schedules = [...store.schedules.filter((s) => s.staff_id !== staffId), ...next]
      return next
    },
  },

  locations: {
    async list(orgId) {
      return org(orgId).locations
    },
    async count(orgId) {
      return org(orgId).locations.length
    },
    async create(orgId, input) {
      const location: Location = {
        id: newId("loc"),
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        timezone: input.timezone,
        is_active: true,
        created_at: now(),
        updated_at: now(),
      }
      org(orgId).locations.push(location)
      return location
    },
  },

  organizations: {
    async get(orgId) {
      return copy(org(orgId).organization ?? undefined)
    },
    async getBySlug(slug) {
      for (const store of db().orgs.values()) {
        if (store.organization?.slug === slug) return store.organization
      }
      return null
    },
    async listAll() {
      return [...db().orgs.values()].flatMap((store) => (store.organization ? [store.organization] : []))
    },
    async updateBookingSettings(orgId, settings) {
      const organization = org(orgId).organization
      if (!organization) return null
      organization.booking = { ...settings }
      organization.updated_at = now()
      return structuredClone(organization)
    },
  },

  deposits: {
    async list(orgId, filter = {}) {
      return org(orgId).deposits.filter(
        (d) =>
          (!filter.appointmentId || d.appointment_id === filter.appointmentId) &&
          (!filter.status || d.status === filter.status)
      )
    },
    async get(orgId, id) {
      return copy(org(orgId).deposits.find((d) => d.id === id))
    },
    async create(orgId, input) {
      const deposit: Deposit = { id: newId("dep"), ...input, created_at: now(), updated_at: now() }
      org(orgId).deposits.push(deposit)
      return deposit
    },
    async update(orgId, id, input) {
      const deposit = org(orgId).deposits.find((d) => d.id === id)
      return deposit ? patch(deposit, input) : null
    },
    async findByReference(reference) {
      for (const [organizationId, store] of db().orgs) {
        const deposit = store.deposits.find((d) => d.provider_reference === reference)
        if (deposit) return { organizationId, deposit }
      }
      return null
    },
  },

  messages: {
    async list(orgId, filter = {}) {
      const rows = org(orgId)
        .messages.filter((m) => !filter.appointmentId || m.appointment_id === filter.appointmentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      return filter.limit ? rows.slice(0, filter.limit) : rows
    },
    async create(orgId, input) {
      const message: Message = { id: newId("msg"), ...input, created_at: now() }
      org(orgId).messages.push(message)
      return message
    },
    async findLatestOutboundTo(to) {
      let latest: { organizationId: string; message: Message } | null = null
      for (const [organizationId, store] of db().orgs) {
        for (const message of store.messages) {
          if (message.direction !== "OUTBOUND" || message.to !== to) continue
          if (!latest || message.created_at > latest.message.created_at) latest = { organizationId, message }
        }
      }
      return latest
    },
  },

  salesLeads: {
    async create(input) {
      const lead: SalesLead = {
        id: newId("lead"),
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        business_name: input.businessName,
        plan: input.plan,
        locations: input.locations,
        staff_count: input.staffCount,
        add_ons: input.addOns,
        message: input.message ?? null,
        country_code: input.countryCode,
        status: "NEW",
        created_at: now(),
      }
      db().salesLeads.push(lead)
      return lead
    },
  },
}
