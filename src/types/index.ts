export type UserRole = "ADMIN" | "STAFF"
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
export type LocationType = "IN_SPA" | "REMOTE"
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER"
export type PaymentStatus = "PENDING" | "COMPLETED" | "REFUNDED"
export type ExpenseCategory = "SUPPLIES" | "UTILITIES" | "RENT" | "PAYROLL" | "EQUIPMENT" | "MARKETING" | "OTHER"
export type RecurrenceInterval = "DAILY" | "WEEKLY" | "MONTHLY"

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string
  avatar_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string
  default_duration_minutes: number
  default_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  client_id: string
  staff_id: string
  service_id: string
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  location_type: LocationType
  location_notes: string
  satisfaction_rating: number | null
  notes: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  appointment_id: string | null
  client_id: string
  staff_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  status: PaymentStatus
  reference_note: string
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  is_recurring: boolean
  recurrence_interval: RecurrenceInterval | null
  receipt_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface StaffSchedule {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}
