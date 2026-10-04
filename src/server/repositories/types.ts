// ---------------------------------------------------------------------------
// Data access contracts
//
// Services depend only on these interfaces. Two implementations exist:
//   memory  - in-process store seeded from src/lib/mock-data (demo default)
//   prisma  - PostgreSQL via Prisma (set DATA_SOURCE=prisma)
// Every method is scoped by organizationId so tenants never see each other.
// ---------------------------------------------------------------------------

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

export interface ClientRepository {
  list(orgId: string, filter?: { search?: string }): Promise<Client[]>
  get(orgId: string, id: string): Promise<Client | null>
  count(orgId: string): Promise<number>
  create(orgId: string, input: ClientInput): Promise<Client>
  update(orgId: string, id: string, input: ClientUpdateInput): Promise<Client | null>
  delete(orgId: string, id: string): Promise<boolean>
}

export interface UserRepository {
  list(orgId: string, filter?: { role?: UserRole; activeOnly?: boolean }): Promise<User[]>
  get(orgId: string, id: string): Promise<User | null>
  count(orgId: string, filter?: { role?: UserRole; activeOnly?: boolean }): Promise<number>
  create(orgId: string, input: UserInviteInput): Promise<User>
  update(orgId: string, id: string, input: StaffUpdateInput): Promise<User | null>
}

export interface ServiceRepository {
  list(orgId: string): Promise<Service[]>
  get(orgId: string, id: string): Promise<Service | null>
}

export interface AppointmentRepository {
  list(
    orgId: string,
    filter?: DateRange & { clientId?: string; staffId?: string }
  ): Promise<Appointment[]>
  get(orgId: string, id: string): Promise<Appointment | null>
  create(orgId: string, input: AppointmentInput): Promise<Appointment>
  update(orgId: string, id: string, input: AppointmentUpdateInput): Promise<Appointment | null>
}

export interface PaymentRepository {
  list(
    orgId: string,
    filter?: DateRange & { clientId?: string; staffId?: string }
  ): Promise<Payment[]>
  create(orgId: string, input: PaymentInput): Promise<Payment>
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
  salesLeads: SalesLeadRepository
}
