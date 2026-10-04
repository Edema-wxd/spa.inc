import "server-only"

import {
  appointments as seedAppointments,
  clients as seedClients,
  expenses as seedExpenses,
  payments as seedPayments,
  schedules as seedSchedules,
  services as seedServices,
  users as seedUsers,
} from "@/lib/mock-data"
import type {
  Appointment,
  Client,
  Expense,
  Location,
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

function seededStore(): OrgStore {
  const createdAt = "2024-01-01T00:00:00Z"
  return {
    clients: structuredClone(seedClients),
    users: structuredClone(seedUsers),
    services: structuredClone(seedServices),
    appointments: structuredClone(seedAppointments),
    payments: structuredClone(seedPayments),
    expenses: structuredClone(seedExpenses),
    schedules: structuredClone(seedSchedules),
    locations: [
      {
        id: "loc-main",
        name: "Main Spa",
        address: null,
        phone: null,
        timezone: "UTC",
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
  }
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

function patch<T extends object>(item: T, input: object): T {
  const defined = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  return Object.assign(item, defined, { updated_at: now() })
}

export const memoryRepositories: Repositories = {
  clients: {
    async list(orgId, filter) {
      const search = filter?.search?.toLowerCase()
      return org(orgId).clients.filter(
        (c) =>
          !search ||
          c.full_name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.phone.includes(search)
      )
    },
    async get(orgId, id) {
      return org(orgId).clients.find((c) => c.id === id) ?? null
    },
    async count(orgId) {
      return org(orgId).clients.length
    },
    async create(orgId, input) {
      const client: Client = {
        id: newId("client"),
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
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
      return client ? patch(client, input) : null
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
      return org(orgId).users.find((u) => u.id === id) ?? null
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
      return org(orgId).services.find((s) => s.id === id) ?? null
    },
  },

  appointments: {
    async list(orgId, filter = {}) {
      return org(orgId).appointments.filter(
        (a) =>
          (!filter.clientId || a.client_id === filter.clientId) &&
          (!filter.staffId || a.staff_id === filter.staffId) &&
          inRange(a.scheduled_at, filter)
      )
    },
    async get(orgId, id) {
      return org(orgId).appointments.find((a) => a.id === id) ?? null
    },
    async create(orgId, input) {
      const appointment: Appointment = {
        id: newId("apt"),
        client_id: input.client_id,
        staff_id: input.staff_id,
        service_id: input.service_id,
        scheduled_at: input.scheduled_at,
        duration_minutes: input.duration_minutes,
        status: "SCHEDULED",
        location_type: input.location_type,
        location_notes: input.location_notes ?? "",
        satisfaction_rating: null,
        notes: input.notes ?? "",
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
      return org(orgId).expenses.find((e) => e.id === id) ?? null
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
