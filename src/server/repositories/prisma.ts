import "server-only"

import type {
  Appointment as DbAppointment,
  BookingSettings as DbBookingSettings,
  Client as DbClient,
  Deposit as DbDeposit,
  Message as DbMessage,
  Organization as DbOrganization,
  Subscription as DbSubscription,
  Expense as DbExpense,
  Location as DbLocation,
  Payment as DbPayment,
  SalesLead as DbSalesLead,
  Service as DbService,
  StaffSchedule as DbStaffSchedule,
  User as DbUser,
} from "@/generated/prisma/client"
import { DEFAULT_BOOKING_SETTINGS } from "@/lib/booking"
import { normalizePhone, phoneDigits, phoneMatchKey } from "@/lib/phone"
import type {
  Appointment,
  BookingSettings,
  Client,
  Deposit,
  Message,
  Organization,
  Subscription,
  Expense,
  Location,
  Payment,
  SalesLead,
  Service,
  StaffSchedule,
  User,
} from "@/types"
import { getPrisma } from "@/server/db/prisma"
import type { AppointmentPatch, DateRange, Repositories } from "@/server/repositories/types"

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
    is_bookable: u.isBookable,
    auth_user_id: u.authUserId,
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
    source: a.source,
    hold_expires_at: a.holdExpiresAt && iso(a.holdExpiresAt),
    confirmed_at: a.confirmedAt && iso(a.confirmedAt),
    reminder_sent_at: a.reminderSentAt && iso(a.reminderSentAt),
    manage_token: a.manageToken,
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

function toBookingSettings(b: DbBookingSettings | null): BookingSettings {
  if (!b) return { ...DEFAULT_BOOKING_SETTINGS }
  return {
    enabled: b.enabled,
    deposit_type: b.depositType,
    deposit_value: b.depositValue,
    cancellation_notice_hours: b.cancellationNoticeHours,
    hold_minutes: b.holdMinutes,
    reminders_enabled: b.remindersEnabled,
    reminder_hours_before: b.reminderHoursBefore,
    min_notice_minutes: b.minNoticeMinutes,
    booking_window_days: b.bookingWindowDays,
    welcome_message: b.welcomeMessage,
  }
}

function toOrganization(o: DbOrganization & { bookingSettings: DbBookingSettings | null }): Organization {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    country_code: o.countryCode,
    currency: o.currency,
    booking: toBookingSettings(o.bookingSettings),
    is_demo: o.isDemo,
    onboarding: {
      link_shared_at: o.onboardingLinkSharedAt && iso(o.onboardingLinkSharedAt),
      dismissed_at: o.onboardingDismissedAt && iso(o.onboardingDismissedAt),
    },
    created_at: iso(o.createdAt),
    updated_at: iso(o.updatedAt),
  }
}

function toDeposit(d: DbDeposit): Deposit {
  return {
    id: d.id,
    appointment_id: d.appointmentId,
    client_id: d.clientId,
    amount: d.amount,
    currency: d.currency,
    provider: d.provider,
    status: d.status,
    provider_reference: d.providerReference,
    checkout_url: d.checkoutUrl,
    payment_id: d.paymentId,
    paid_at: d.paidAt && iso(d.paidAt),
    created_at: iso(d.createdAt),
    updated_at: iso(d.updatedAt),
  }
}

function toMessage(m: DbMessage): Message {
  return {
    id: m.id,
    appointment_id: m.appointmentId,
    client_id: m.clientId,
    channel: m.channel,
    kind: m.kind,
    direction: m.direction,
    to: m.to,
    body: m.body,
    status: m.status,
    provider_message_id: m.providerMessageId,
    error: m.error,
    created_at: iso(m.createdAt),
  }
}

const nullableDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value)

/** Shared by create and update: the system-managed appointment fields. */
function appointmentSystemData(input: AppointmentPatch) {
  return {
    status: input.status,
    source: input.source,
    holdExpiresAt: nullableDate(input.hold_expires_at),
    confirmedAt: nullableDate(input.confirmed_at),
    reminderSentAt: nullableDate(input.reminder_sent_at),
    manageToken: input.manage_token,
  }
}

const withSettings = { bookingSettings: true } as const

function toSubscription(s: DbSubscription): Subscription {
  return {
    organization_id: s.organizationId,
    plan: s.plan.toLowerCase() as Subscription["plan"],
    status: s.status,
    trial_ends_at: s.trialEndsAt && iso(s.trialEndsAt),
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
  }
}

const toPlanTier = (plan: Subscription["plan"]) => plan.toUpperCase() as DbSubscription["plan"]

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
              // Phones are stored as digits, so search by digits too
              ...(phoneDigits(search).length >= 3 ? [{ phone: { contains: phoneDigits(search) } }] : []),
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
    async findByPhone(orgId, phone) {
      const key = phoneMatchKey(phone)
      if (key.length < 7) return null
      // Narrow in SQL by the last 7 digits, then compare formats in code
      const rows = await getPrisma().client.findMany({
        where: { organizationId: orgId, phone: { contains: key.slice(-7) } },
        take: 20,
      })
      const match = rows.find((c) => c.phone && phoneMatchKey(c.phone) === key)
      return match ? toClient(match) : null
    },
    async create(orgId, input) {
      const row = await getPrisma().client.create({
        data: {
          organizationId: orgId,
          fullName: input.full_name,
          email: input.email || null,
          phone: normalizePhone(input.phone),
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
          phone: input.phone && normalizePhone(input.phone),
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
      const row = await getPrisma().user.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          email: input.email,
          fullName: input.full_name,
          phone: input.phone && normalizePhone(input.phone),
          role: input.role,
          isBookable: input.is_bookable ?? input.role === "STAFF",
          authUserId: input.auth_user_id ?? null,
        },
      })
      return toUser(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().user.updateMany({
        where: { id, organizationId: orgId },
        data: {
          fullName: input.full_name,
          phone: input.phone,
          isActive: input.is_active,
          isBookable: input.is_bookable,
        },
      })
      return count ? this.get(orgId, id) : null
    },
    async findByAuthUserId(authUserId) {
      const row = await getPrisma().user.findUnique({ where: { authUserId } })
      return row && { organizationId: row.organizationId, user: toUser(row) }
    },
    async findByEmail(email) {
      const row = await getPrisma().user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } })
      return row && { organizationId: row.organizationId, user: toUser(row) }
    },
    async linkAuthUser(orgId, id, authUserId) {
      const { count } = await getPrisma().user.updateMany({ where: { id, organizationId: orgId }, data: { authUserId } })
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
    async create(orgId, input) {
      const row = await getPrisma().service.create({
        data: {
          organizationId: orgId,
          name: input.name,
          description: input.description,
          defaultDurationMinutes: input.default_duration_minutes,
          defaultPrice: input.default_price,
          isActive: input.is_active,
        },
      })
      return toService(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().service.updateMany({
        where: { id, organizationId: orgId },
        data: {
          name: input.name,
          description: input.description,
          defaultDurationMinutes: input.default_duration_minutes,
          defaultPrice: input.default_price,
          isActive: input.is_active,
        },
      })
      return count ? this.get(orgId, id) : null
    },
  },

  appointments: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().appointment.findMany({
        where: {
          organizationId: orgId,
          clientId: filter.clientId,
          staffId: filter.staffId,
          status: filter.status,
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
    async getByManageToken(orgId, token) {
      const row = await getPrisma().appointment.findFirst({ where: { manageToken: token, organizationId: orgId } })
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
          ...appointmentSystemData(input),
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
          staffId: input.staff_id,
          locationType: input.location_type,
          locationNotes: input.location_notes,
          satisfactionRating: input.satisfaction_rating,
          notes: input.notes,
          ...appointmentSystemData(input),
        },
      })
      return count ? this.get(orgId, id) : null
    },
  },

  payments: {
    async get(orgId, id) {
      const row = await getPrisma().payment.findFirst({ where: { id, organizationId: orgId } })
      return row && toPayment(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().payment.updateMany({
        where: { id, organizationId: orgId },
        data: { status: input.status, referenceNote: input.reference_note },
      })
      return count ? this.get(orgId, id) : null
    },
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

  organizations: {
    async get(orgId) {
      const row = await getPrisma().organization.findUnique({ where: { id: orgId }, include: withSettings })
      return row && toOrganization(row)
    },
    async getBySlug(slug) {
      const row = await getPrisma().organization.findUnique({ where: { slug }, include: withSettings })
      return row && toOrganization(row)
    },
    async listAll() {
      const rows = await getPrisma().organization.findMany({ include: withSettings })
      return rows.map(toOrganization)
    },
    async updateBookingSettings(orgId, settings) {
      const data = {
        enabled: settings.enabled,
        depositType: settings.deposit_type,
        depositValue: settings.deposit_value,
        cancellationNoticeHours: settings.cancellation_notice_hours,
        holdMinutes: settings.hold_minutes,
        remindersEnabled: settings.reminders_enabled,
        reminderHoursBefore: settings.reminder_hours_before,
        minNoticeMinutes: settings.min_notice_minutes,
        bookingWindowDays: settings.booking_window_days,
        welcomeMessage: settings.welcome_message,
      }
      await getPrisma().bookingSettings.upsert({
        where: { organizationId: orgId },
        create: { organizationId: orgId, ...data },
        update: data,
      })
      return this.get(orgId)
    },
    async updateOnboarding(orgId, patch) {
      await getPrisma().organization.update({
        where: { id: orgId },
        data: {
          onboardingLinkSharedAt: nullableDate(patch.link_shared_at),
          onboardingDismissedAt: nullableDate(patch.dismissed_at),
        },
      })
      return this.get(orgId)
    },
    async createWithOwner(input) {
      const prisma = getPrisma()
      const [organization, owner] = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            countryCode: input.country_code,
            currency: input.currency,
            bookingSettings: { create: {} },
            subscription: {
              create: {
                plan: toPlanTier(input.plan),
                status: "TRIALING",
                currency: input.currency,
                trialEndsAt: new Date(input.trial_ends_at),
              },
            },
            locations: { create: { name: input.name, phone: normalizePhone(input.phone), timezone: input.timezone } },
          },
          include: withSettings,
        })
        const user = await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: org.id,
            authUserId: input.owner.auth_user_id,
            email: input.owner.email,
            fullName: input.owner.full_name,
            phone: normalizePhone(input.owner.phone),
            role: "ADMIN",
          },
        })
        return [org, user] as const
      })
      return { organization: toOrganization(organization), owner: toUser(owner) }
    },
  },

  subscriptions: {
    async get(orgId) {
      const row = await getPrisma().subscription.findUnique({ where: { organizationId: orgId } })
      return row && toSubscription(row)
    },
    async update(orgId, input) {
      const row = await getPrisma().subscription.update({
        where: { organizationId: orgId },
        data: {
          plan: input.plan && toPlanTier(input.plan),
          status: input.status,
          trialEndsAt: nullableDate(input.trial_ends_at),
        },
      })
      return toSubscription(row)
    },
  },

  deposits: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().deposit.findMany({
        where: { organizationId: orgId, appointmentId: filter.appointmentId, status: filter.status },
        orderBy: { createdAt: "desc" },
      })
      return rows.map(toDeposit)
    },
    async get(orgId, id) {
      const row = await getPrisma().deposit.findFirst({ where: { id, organizationId: orgId } })
      return row && toDeposit(row)
    },
    async create(orgId, input) {
      const row = await getPrisma().deposit.create({
        data: {
          organizationId: orgId,
          appointmentId: input.appointment_id,
          clientId: input.client_id,
          amount: input.amount,
          currency: input.currency,
          provider: input.provider,
          status: input.status,
          providerReference: input.provider_reference,
          checkoutUrl: input.checkout_url,
          paymentId: input.payment_id,
          paidAt: nullableDate(input.paid_at),
        },
      })
      return toDeposit(row)
    },
    async update(orgId, id, input) {
      const { count } = await getPrisma().deposit.updateMany({
        where: { id, organizationId: orgId },
        data: {
          status: input.status,
          providerReference: input.provider_reference,
          checkoutUrl: input.checkout_url,
          paymentId: input.payment_id,
          paidAt: nullableDate(input.paid_at),
        },
      })
      return count ? this.get(orgId, id) : null
    },
    async findByReference(reference) {
      const row = await getPrisma().deposit.findUnique({ where: { providerReference: reference } })
      return row && { organizationId: row.organizationId, deposit: toDeposit(row) }
    },
  },

  messages: {
    async list(orgId, filter = {}) {
      const rows = await getPrisma().message.findMany({
        where: { organizationId: orgId, appointmentId: filter.appointmentId },
        orderBy: { createdAt: "desc" },
        take: filter.limit,
      })
      return rows.map(toMessage)
    },
    async create(orgId, input) {
      const row = await getPrisma().message.create({
        data: {
          organizationId: orgId,
          appointmentId: input.appointment_id,
          clientId: input.client_id,
          channel: input.channel,
          kind: input.kind,
          direction: input.direction,
          to: input.to,
          body: input.body,
          status: input.status,
          providerMessageId: input.provider_message_id,
          error: input.error,
        },
      })
      return toMessage(row)
    },
    async findLatestOutboundTo(to) {
      const row = await getPrisma().message.findFirst({
        where: { to, direction: "OUTBOUND" },
        orderBy: { createdAt: "desc" },
      })
      return row && { organizationId: row.organizationId, message: toMessage(row) }
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
