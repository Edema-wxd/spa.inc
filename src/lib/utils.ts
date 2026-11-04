import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { formatDateKey } from "@/lib/time"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

/** Short axis labels: "$850", "$12.5k" */
export function formatCurrencyAxis(cents: number): string {
  const dollars = cents / 100
  if (Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  }
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

/** "+8.2%" / "-3.1%" */
export function formatPercentChange(change: number): string {
  return `${change > 0 ? "+" : ""}${change.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}

/** "PAYROLL" -> "Payroll", "NO_SHOW" -> "No show" */
export function humanize(value: string): string {
  const text = value.replace(/_/g, " ").toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatDate(date: string | Date): string {
  // Date-only strings ("2026-11-03") are calendar dates, not UTC midnight
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return formatDateKey(date, { month: "short", day: "numeric", year: "numeric" })
  }
  return format(new Date(date), "MMM d, yyyy")
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy h:mm a")
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (phone.trim().startsWith("+")) return `+${cleaned}`
  return phone
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700"
    case "SCHEDULED":
    case "PENDING":
      return "bg-amber-100 text-amber-700"
    case "CANCELLED":
    case "REFUNDED":
      return "bg-red-100 text-red-700"
    case "NO_SHOW":
      return "bg-gray-100 text-gray-600"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
