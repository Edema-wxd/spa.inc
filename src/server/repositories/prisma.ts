import "server-only"

import type {
  Appointment as DbAppointment,
  Client as DbClient,
  Expense as DbExpense,
  Location as DbLocation,
  Payment as DbPayment,
  SalesLead as DbSalesLead,
  Service as DbService,
  StaffSchedule as DbStaffSchedule,
  User as DbUser,
} from "@/generated/prisma/client"
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
import { getPrisma } from "@/server/db/prisma"
import type { DateRange, Repositories } from "@/server/repositories/types"

// ---------------------------------------------------------------------------
// Mappers: Prisma models (camelCase, Date) -> API shapes (snake_case, ISO)
// ---------------------------------------------------------------------------

const iso = (d: Date) => d.toISOString()
const day = (d: Date) => d.toISOString().slice(0, 10)

function toClient(c: DbClient): Client {
  return {
    id: c.id,
    full_name: c.fullName,
    email: c.email ?? "",
    phone: c.phone ?? "",
    date_of_birth: c.dateOfBirth ? day(c.dateOfBirth) : "",
    address: c.address ?? "",
    notes: c.notes ?? "",
    created_at: iso(c.createdAt),
    updated_at: iso(c.updatedAt),
  }
}

function toUser(u: DbUser): User {
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    role: u.role,
    phone: u.phone ?? "",
    avatar_url: u.avatarUrl ?? "",
    is_active: u.isActive,
    created_at: iso(u.createdAt),
    updated_at: iso(u.updatedAt),
  }
}

function toService(s: DbService): Service {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    default_duration_minutes: s.defaultDurationMinutes,
    default_price: s.defaultPrice,
    is_active: s.isActive,
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
  }
}

function toAppointment(a: DbAppointment): Appointment {
  return {
    id: a.id,
    client_id: a.clientId,
    staff_id: a.staffId,
    service_id: a.serviceId,
    scheduled_at: iso(a.scheduledAt),
    duration_minutes: a.durationMinutes,
    status: a.status,
    location_type: a.locationType,
    location_notes: a.locationNotes ?? "",
    satisfaction_rating: a.satisfactionRating,
    notes: a.notes ?? "",
    created_at: iso(a.createdAt),
    updated_at: iso(a.updatedAt),
  }
}

function toPayment(p: DbPayment): Payment {
  return {
    id: p.id,
    appointment_id: p.appointmentId,
    client_id: p.clientId,
    staff_id: p.staffId,
    amount: p.amount,
    payment_method: p.paymentMethod,
    payment_date: day(p.paymentDate),
    status: p.status,
    reference_note: p.referenceNote ?? "",
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  }
}

function toExpense(e: DbExpense): Expense {
  return {
    id: e.id,
    category: e.category,
    description: e.description,
    amount: e.amount,
    expense_date: day(e.expenseDate),
    is_recurring: e.isRecurring,
    recurrence_interval: e.recurrenceInterval,
    receipt_url: e.receiptUrl,
    created_by: e.createdById,
    created_at: iso(e.createdAt),
    updated_at: iso(e.updatedAt),
  }
}

function toSchedule(s: DbStaffSchedule): StaffSchedule {
  return {
    id: s.id,
    staff_id: s.staffId,
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    is_available: s.isAvailable,
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
  }
}

function toLocation(l: DbLocation): Location {
  return {
    id: l.id,
    name: l.name,
    address: l.address,
    phone: l.phone,
    timezone: l.timezone,
    is_active: l.isActive,
    created_at: iso(l.createdAt),
    updated_at: iso(l.updatedAt),
  }
}

function toSalesLead(l: DbSalesLead): SalesLead {
  return {
    id: l.id,
    full_name: l.fullName,
    email: l.email,
    phone: l.phone,
    business_name: l.businessName,
    plan: l.plan.toLowerCase(),
    locations: l.locations,
    staff_count: l.staffCount,
    add_ons: l.addOns,
    message: l.message,
    country_code: l.countryCode,
    status: l.status,
    created_at: iso(l.createdAt),
  }
}

function dateFilter(range: DateRange) {
  if (!range.from && !range.to) return undefined
  return {
    ...(range.from && { gte: new Date(`${range.from}T00:00:00Z`) }),
    ...(range.to && { lte: new Date(`${range.to}T23:59:59.999Z`) }),
  }
}

const optionalDate = (value?: string) => (value ? new Date(value) : undefined)

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export const prismaRepositories: Repositories = {
  clients: {
    async list(orgId, filter) {
      const search = filter?.search
      const rows = await getPrisma().client.findMany({
        where: {
          organizationId: orgId,
          ...(search && {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }),
        },
        orderBy: { fullName: "asc" },
      })
      return rows.map(toClient)
    },
    async get(orgId, id) {
      const row = await getPrisma().client.findFirst({ where: { id, organizationId: orgId } })
      return row && toClient(row)
    },
    async count(orgId) {
      return getPrisma().client.count({ where: { organizationId: orgId } })
    },
    async create(orgId, input) {
      const row = await getPrisma().client.create({
        data: {
          organizationId: orgId,
          fullName: input.full_name,
          email: input.email,
          phone: input.phone,
          dateOfBirth: optionalDate(input.date_of_birth),
          address: input.address,
          notes: input.notes,
        },
      })
      return toClient(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().client.updateMany({
        where: { id, organizationId: orgId },
        data: {
          fullName: input.full_name,
          email: input.email,
          phone: input.phone,
          dateOfBirth: optionalDate(input.date_of_birth),
          address: input.address,
          notes: input.notes,
        },
      })
      return count ? this.get(orgId, id) : null
    },
    async delete(orgId, id) {
      const { count } = await getPrisma().client.deleteMany({ where: { id, organizationId: orgId } })
      return count > 0
    },
  },

  users: {
    async list(orgId, filter) {
      const rows = await getPrisma().user.findMany({
        where: {
          organizationId: orgId,
          ...(filter?.role && { role: filter.role }),
          ...(filter?.activeOnly && { isActive: true }),
        },
        orderBy: { fullName: "asc" },
      })
      return rows.map(toUser)
    },
    async get(orgId, id) {
      const row = await getPrisma().user.findFirst({ where: { id, organizationId: orgId } })
      return row && toUser(row)
    },
    async count(orgId, filter) {
      return getPrisma().user.count({
        where: {
          organizationId: orgId,
          ...(filter?.role && { role: filter.role }),
          ...(filter?.activeOnly && { isActive: true }),
        },
      })
    },
    async create(orgId, input) {
      // TODO: create the Supabase auth user first and reuse its id
      const row = await getPrisma().user.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          email: input.email,
          fullName: input.full_name,
          phone: input.phone,
          role: input.role,
        },
      })
      return toUser(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().user.updateMany({
        where: { id, organizationId: orgId },
        data: { fullName: input.full_name, phone: input.phone, isActive: input.is_active },
      })
      return count ? this.get(orgId, id) : null
    },
  },

  services: {
    async list(orgId) {
      const rows = await getPrisma().service.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      })
      return rows.map(toService)
    },
    async get(orgId, id) {
      const row = await getPrisma().service.findFirst({ where: { id, organizationId: orgId } })
      return row && toService(row)
    },
  },

  appointments: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().appointment.findMany({
        where: {
          organizationId: orgId,
          clientId: filter.clientId,
          staffId: filter.staffId,
          scheduledAt: dateFilter(filter),
        },
        orderBy: { scheduledAt: "desc" },
      })
      return rows.map(toAppointment)
    },
    async get(orgId, id) {
      const row = await getPrisma().appointment.findFirst({ where: { id, organizationId: orgId } })
      return row && toAppointment(row)
    },
    async create(orgId, input) {
      const row = await getPrisma().appointment.create({
        data: {
          organizationId: orgId,
          clientId: input.client_id,
          staffId: input.staff_id,
          serviceId: input.service_id,
          scheduledAt: new Date(input.scheduled_at),
          durationMinutes: input.duration_minutes,
          locationType: input.location_type,
          locationNotes: input.location_notes,
          notes: input.notes,
        },
      })
      return toAppointment(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().appointment.updateMany({
        where: { id, organizationId: orgId },
        data: {
          scheduledAt: optionalDate(input.scheduled_at),
          durationMinutes: input.duration_minutes,
          status: input.status,
          staffId: input.staff_id,
          locationType: input.location_type,
          locationNotes: input.location_notes,
          satisfactionRating: input.satisfaction_rating,
          notes: input.notes,
        },
      })
      return count ? this.get(orgId, id) : null
    },
  },

  payments: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().payment.findMany({
        where: {
          organizationId: orgId,
          clientId: filter.clientId,
          staffId: filter.staffId,
          paymentDate: dateFilter(filter),
        },
        orderBy: { paymentDate: "desc" },
      })
      return rows.map(toPayment)
    },
    async create(orgId, input) {
      const row = await getPrisma().payment.create({
        data: {
          organizationId: orgId,
          appointmentId: input.appointment_id,
          clientId: input.client_id,
          staffId: input.staff_id,
          amount: input.amount,
          paymentMethod: input.payment_method,
          paymentDate: new Date(input.payment_date),
          status: input.status,
          referenceNote: input.reference_note,
        },
      })
      return toPayment(row)
    },
  },

  expenses: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().expense.findMany({
        where: { organizationId: orgId, expenseDate: dateFilter(filter) },
        orderBy: { expenseDate: "desc" },
      })
      return rows.map(toExpense)
    },
    async get(orgId, id) {
      const row = await getPrisma().expense.findFirst({ where: { id, organizationId: orgId } })
      return row && toExpense(row)
    },
    async create(orgId, input) {
      const row = await getPrisma().expense.create({
        data: {
          organizationId: orgId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          expenseDate: new Date(input.expense_date),
          isRecurring: input.is_recurring,
          recurrenceInterval: input.is_recurring ? input.recurrence_interval : null,
          createdById: input.created_by,
        },
      })
      return toExpense(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().expense.updateMany({
        where: { id, organizationId: orgId },
        data: {
          category: input.category,
          description: input.description,
          amount: input.amount,
          expenseDate: optionalDate(input.expense_date),
          isRecurring: input.is_recurring,
          recurrenceInterval: input.recurrence_interval,
        },
      })
      return count ? this.get(orgId, id) : null
    },
    async delete(orgId, id) {
      const { count } = await getPrisma().expense.deleteMany({ where: { id, organizationId: orgId } })
      return count > 0
    },
  },

  schedules: {
    async listForStaff(orgId, staffId) {
      const rows = await getPrisma().staffSchedule.findMany({
        where: { staffId, staff: { organizationId: orgId } },
        orderBy: { dayOfWeek: "asc" },
      })
      return rows.map(toSchedule)
    },
    async replaceForStaff(orgId, staffId, items) {
      const prisma = getPrisma()
      await prisma.$transaction([
        prisma.staffSchedule.deleteMany({ where: { staffId, staff: { organizationId: orgId } } }),
        prisma.staffSchedule.createMany({
          data: items.map((item) => ({
            staffId,
            dayOfWeek: item.day_of_week,
            startTime: item.start_time,
            endTime: item.end_time,
            isAvailable: item.is_available,
          })),
        }),
      ])
      return this.listForStaff(orgId, staffId)
    },
  },

  locations: {
    async list(orgId) {
      const rows = await getPrisma().location.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "asc" },
      })
      return rows.map(toLocation)
    },
    async count(orgId) {
      return getPrisma().location.count({ where: { organizationId: orgId } })
    },
    async create(orgId, input) {
      const row = await getPrisma().location.create({
        data: {
          organizationId: orgId,
          name: input.name,
          address: input.address,
          phone: input.phone,
          timezone: input.timezone,
        },
      })
      return toLocation(row)
    },
  },

  salesLeads: {
    async create(input) {
      const row = await getPrisma().salesLead.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          businessName: input.businessName,
          plan: input.plan.toUpperCase() as DbSalesLead["plan"],
          locations: input.locations,
          staffCount: input.staffCount,
          addOns: input.addOns,
          message: input.message,
          countryCode: input.countryCode,
        },
      })
      return toSalesLead(row)
    },
  },
}
