// ---------------------------------------------------------------------------
// Data access contracts
//
// Services depend only on these interfaces. Two implementations exist:
//   memory  - in-process store seeded from src/server/demo (demo default)
//   prisma  - PostgreSQL via Prisma (set DATA_SOURCE=prisma)
// Every method is scoped by organizationId so tenants never see each other.
// ---------------------------------------------------------------------------

import type {
  Appointment,
  AppointmentStatus,
  BookingSettings,
  BookingSource,
  Client,
  Deposit,
  Expense,
  Message,
  Organization,
  Subscription,
  Location,
  Payment,
  SalesLead,
  Service,
  StaffSchedule,
  User,
  UserRole,
} from "@/types"
import type { AppointmentInput, AppointmentUpdateInput } from "@/lib/validation/appointments"
import type { ClientInput, ClientUpdateInput } from "@/lib/validation/clients"
import type { ExpenseInput, ExpenseUpdateInput } from "@/lib/validation/expenses"
import type { LocationInput } from "@/lib/validation/locations"
import type { PaymentInput } from "@/lib/validation/payments"
import type { SalesLeadInput } from "@/lib/validation/sales-leads"
import type { ScheduleInput, StaffUpdateInput, UserInviteInput } from "@/lib/validation/users"

export interface DateRange {
  from?: string
  to?: string
}

/** Fields only the system sets (online booking, deposits, reminders). */
export interface AppointmentSystemFields {
  status?: AppointmentStatus
  source?: BookingSource
  hold_expires_at?: string | null
  confirmed_at?: string | null
  reminder_sent_at?: string | null
  manage_token?: string | null
}

export type AppointmentCreateData = Omit<AppointmentInput, "allow_outside_hours"> & {
  duration_minutes: number
} & AppointmentSystemFields

export type AppointmentPatch = Omit<AppointmentUpdateInput, "status" | "allow_outside_hours"> & AppointmentSystemFields

export interface ClientRepository {
  list(orgId: string, filter?: { search?: string }): Promise<Client[]>
  get(orgId: string, id: string): Promise<Client | null>
  count(orgId: string): Promise<number>
  /** Match by phone number, ignoring formatting (compares the last 10 digits). */
  findByPhone(orgId: string, phone: string): Promise<Client | null>
  create(orgId: string, input: ClientInput): Promise<Client>
  update(orgId: string, id: string, input: ClientUpdateInput): Promise<Client | null>
  delete(orgId: string, id: string): Promise<boolean>
}

export interface UserRepository {
  list(orgId: string, filter?: { role?: UserRole; activeOnly?: boolean }): Promise<User[]>
  get(orgId: string, id: string): Promise<User | null>
  count(orgId: string, filter?: { role?: UserRole; activeOnly?: boolean }): Promise<number>
  create(orgId: string, input: UserInviteInput & { is_bookable?: boolean; auth_user_id?: string | null }): Promise<User>
  update(orgId: string, id: string, input: StaffUpdateInput & { is_bookable?: boolean }): Promise<User | null>
  /** Sign-in: find the person behind an auth identity (searches every organization). */
  findByAuthUserId(authUserId: string): Promise<{ organizationId: string; user: User } | null>
  /** Sign-in: link an invited person by email the first time they sign in (every organization). */
  findByEmail(email: string): Promise<{ organizationId: string; user: User } | null>
  linkAuthUser(orgId: string, id: string, authUserId: string): Promise<User | null>
}

export interface ServiceInputData {
  name: string
  description: string
  default_duration_minutes: number
  default_price: number
  is_active: boolean
}

export interface ServiceRepository {
  list(orgId: string): Promise<Service[]>
  get(orgId: string, id: string): Promise<Service | null>
  create(orgId: string, input: ServiceInputData): Promise<Service>
  update(orgId: string, id: string, input: Partial<ServiceInputData>): Promise<Service | null>
}

export interface AppointmentRepository {
  list(
    orgId: string,
    filter?: DateRange & { clientId?: string; staffId?: string; status?: AppointmentStatus }
  ): Promise<Appointment[]>
  get(orgId: string, id: string): Promise<Appointment | null>
  getByManageToken(orgId: string, token: string): Promise<Appointment | null>
  create(orgId: string, input: AppointmentCreateData): Promise<Appointment>
  update(orgId: string, id: string, input: AppointmentPatch): Promise<Appointment | null>
}

export interface PaymentRepository {
  list(
    orgId: string,
    filter?: DateRange & { clientId?: string; staffId?: string }
  ): Promise<Payment[]>
  get(orgId: string, id: string): Promise<Payment | null>
  create(orgId: string, input: PaymentInput): Promise<Payment>
  update(orgId: string, id: string, input: Partial<Pick<Payment, "status" | "reference_note">>): Promise<Payment | null>
}

export interface ExpenseRepository {
  list(orgId: string, filter?: DateRange): Promise<Expense[]>
  get(orgId: string, id: string): Promise<Expense | null>
  create(orgId: string, input: ExpenseInput & { created_by: string }): Promise<Expense>
  update(orgId: string, id: string, input: ExpenseUpdateInput): Promise<Expense | null>
  delete(orgId: string, id: string): Promise<boolean>
}

export interface ScheduleRepository {
  listForStaff(orgId: string, staffId: string): Promise<StaffSchedule[]>
  replaceForStaff(orgId: string, staffId: string, items: ScheduleInput): Promise<StaffSchedule[]>
}

export interface LocationRepository {
  list(orgId: string): Promise<Location[]>
  count(orgId: string): Promise<number>
  create(orgId: string, input: LocationInput): Promise<Location>
}

export interface OrganizationRepository {
  get(orgId: string): Promise<Organization | null>
  /** Public booking pages address a business by slug (not tenant-scoped by design). */
  getBySlug(slug: string): Promise<Organization | null>
  /** Every organization, for scheduled jobs. */
  listAll(): Promise<Organization[]>
  updateBookingSettings(orgId: string, settings: BookingSettings): Promise<Organization | null>
  updateOnboarding(orgId: string, patch: Partial<Organization["onboarding"]>): Promise<Organization | null>
  /**
   * Sign-up: the business, its first location, the owner and a trial
   * subscription, created together (one transaction on Postgres).
   */
  createWithOwner(input: NewOrganizationData): Promise<{ organization: Organization; owner: User }>
}

export interface NewOrganizationData {
  name: string
  slug: string
  country_code: string
  currency: Organization["currency"]
  timezone: string
  phone: string
  owner: { full_name: string; email: string; phone: string; auth_user_id: string }
  plan: Subscription["plan"]
  trial_ends_at: string
}

export interface SubscriptionRepository {
  get(orgId: string): Promise<Subscription | null>
  update(orgId: string, input: Partial<Pick<Subscription, "plan" | "status" | "trial_ends_at">>): Promise<Subscription | null>
}

export type DepositCreateData = Omit<Deposit, "id" | "created_at" | "updated_at">

export interface DepositRepository {
  list(orgId: string, filter?: { appointmentId?: string; status?: Deposit["status"] }): Promise<Deposit[]>
  get(orgId: string, id: string): Promise<Deposit | null>
  create(orgId: string, input: DepositCreateData): Promise<Deposit>
  update(orgId: string, id: string, input: Partial<DepositCreateData>): Promise<Deposit | null>
  /** Payment webhooks only know the provider reference, so this one searches every organization. */
  findByReference(reference: string): Promise<{ organizationId: string; deposit: Deposit } | null>
}

export type MessageCreateData = Omit<Message, "id" | "created_at">

export interface MessageRepository {
  list(orgId: string, filter?: { appointmentId?: string; limit?: number }): Promise<Message[]>
  create(orgId: string, input: MessageCreateData): Promise<Message>
  /** Inbound WhatsApp replies only carry the phone number; find the conversation it belongs to. */
  findLatestOutboundTo(to: string): Promise<{ organizationId: string; message: Message } | null>
}

export interface SalesLeadRepository {
  create(input: SalesLeadInput & { countryCode: string | null }): Promise<SalesLead>
}

export interface Repositories {
  clients: ClientRepository
  users: UserRepository
  services: ServiceRepository
  appointments: AppointmentRepository
  payments: PaymentRepository
  expenses: ExpenseRepository
  schedules: ScheduleRepository
  locations: LocationRepository
  organizations: OrganizationRepository
  subscriptions: SubscriptionRepository
  deposits: DepositRepository
  messages: MessageRepository
  salesLeads: SalesLeadRepository
}
