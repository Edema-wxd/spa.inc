export type UserRole = "ADMIN" | "STAFF"
/** PENDING_DEPOSIT: booked online, slot held until the deposit is paid or the hold expires */
export type AppointmentStatus = "PENDING_DEPOSIT" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
export type BookingSource = "DASHBOARD" | "ONLINE"
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
  source: BookingSource
  /** While PENDING_DEPOSIT, the slot is released after this instant */
  hold_expires_at: string | null
  /** Set when the client confirms (e.g. replies 1 on WhatsApp) */
  confirmed_at: string | null
  reminder_sent_at: string | null
  /** Secret for the client's manage-booking link; null for dashboard bookings without one */
  manage_token: string | null
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

export interface Location {
  id: string
  name: string
  address: string | null
  phone: string | null
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SalesLead {
  id: string
  full_name: string
  email: string
  phone: string
  business_name: string
  plan: string
  locations: string
  staff_count: string
  add_ons: string[]
  message: string | null
  country_code: string | null
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "WON" | "LOST"
  created_at: string
}

// ---------------------------------------------------------------------------
// Online booking
// ---------------------------------------------------------------------------

export type BusinessCurrency = "USD" | "NGN"
export type DepositType = "NONE" | "FIXED" | "PERCENT"

export interface BookingSettings {
  enabled: boolean
  deposit_type: DepositType
  /** Minor units (cents / kobo) for FIXED, whole percent for PERCENT */
  deposit_value: number
  /** Free cancellation (deposit refunded) until this many hours before the start */
  cancellation_notice_hours: number
  /** Minutes an unpaid online booking holds its slot */
  hold_minutes: number
  reminders_enabled: boolean
  reminder_hours_before: number
  /** Earliest bookable time, in minutes from now */
  min_notice_minutes: number
  /** How far ahead clients can book */
  booking_window_days: number
  welcome_message: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  country_code: string
  currency: BusinessCurrency
  booking: BookingSettings
  created_at: string
  updated_at: string
}

export type DepositProviderId = "DEMO" | "PAYSTACK" | "STRIPE"
export type DepositStatus = "PENDING" | "PAID" | "REFUNDED" | "FORFEITED" | "EXPIRED"

export interface Deposit {
  id: string
  appointment_id: string
  client_id: string
  /** Minor units in `currency` */
  amount: number
  currency: BusinessCurrency
  provider: DepositProviderId
  status: DepositStatus
  /** Reference used with the payment provider (Paystack reference, Stripe session id) */
  provider_reference: string
  checkout_url: string | null
  /** The Payment row created when the deposit was paid */
  payment_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type MessageChannel = "WHATSAPP" | "SMS" | "EMAIL"
export type MessageKind =
  | "BOOKING_CONFIRMATION"
  | "DEPOSIT_REQUEST"
  | "REMINDER"
  | "CANCELLATION"
  | "REPLY"
/** SIMULATED: recorded but not sent because no provider is configured (demo) */
export type MessageStatus = "SIMULATED" | "SENT" | "FAILED" | "RECEIVED"

export interface Message {
  id: string
  appointment_id: string | null
  client_id: string | null
  channel: MessageChannel
  kind: MessageKind
  direction: "OUTBOUND" | "INBOUND"
  /** E.164 digits without "+" for WhatsApp/SMS, an address for email */
  to: string
  body: string
  status: MessageStatus
  provider_message_id: string | null
  error: string | null
  created_at: string
}
