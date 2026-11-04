import type { BookingSettings, BusinessCurrency } from "@/types"

/** Settings for a business that hasn't configured online booking yet. */
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled: true,
  deposit_type: "NONE",
  deposit_value: 0,
  cancellation_notice_hours: 24,
  hold_minutes: 30,
  reminders_enabled: true,
  reminder_hours_before: 24,
  min_notice_minutes: 120,
  booking_window_days: 30,
  welcome_message: "",
}

/** Deposit in minor units for a service price, or 0 when none is required. Never more than the price. */
export function depositFor(price: number, settings: Pick<BookingSettings, "deposit_type" | "deposit_value">): number {
  if (settings.deposit_type === "FIXED") return Math.min(price, settings.deposit_value)
  if (settings.deposit_type === "PERCENT") return Math.min(price, Math.round((price * settings.deposit_value) / 100))
  return 0
}

/** Money in minor units (cents, kobo) in the business currency: "$85.00", "₦15,000". */
export function formatMoney(amountMinor: number, currency: BusinessCurrency): string {
  const major = amountMinor / 100
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(major) && currency === "NGN" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}

/** One-line cancellation policy shown on the booking page and in messages. */
export function cancellationPolicy(settings: BookingSettings, deposit: string | null): string {
  const hours = settings.cancellation_notice_hours
  if (!deposit) {
    return hours > 0
      ? `Please cancel or reschedule at least ${hours} hours before your appointment.`
      : "You can cancel or reschedule at any time before your appointment."
  }
  return hours > 0
    ? `A ${deposit} deposit holds your booking and comes off your bill. Cancel at least ${hours} hours ahead for a full refund; later cancellations and no-shows keep the deposit.`
    : `A ${deposit} deposit holds your booking and comes off your bill. It is refunded if you cancel before the appointment; no-shows keep the deposit.`
}
