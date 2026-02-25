import { Payment } from "@/types"
import { format, subDays } from "date-fns"
import { appointments } from "./appointments"
import { services } from "./services"

function pseudoInt(min: number, max: number, seed: number): number {
  return min + (Math.abs(seed) % (max - min + 1))
}

function generatePayments(): Payment[] {
  const payments: Payment[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get completed appointments for linking
  const completedAppointments = appointments.filter(
    (a) => a.status === "COMPLETED"
  )

  // Generate 200 payments
  // ~180 linked to completed appointments, ~20 standalone (gift cards, packages, tips)
  const linkedCount = Math.min(180, completedAppointments.length)

  for (let i = 0; i < 200; i++) {
    const seed1 = (i * 19 + 7) % 1000
    const seed2 = (i * 29 + 13) % 1000
    const seed3 = (i * 41 + 3) % 1000

    let appointmentId: string | null = null
    let clientId: string
    let staffId: string
    let amount: number
    let paymentDate: string

    if (i < linkedCount) {
      // Linked to a completed appointment
      const apt = completedAppointments[i]
      appointmentId = apt.id
      clientId = apt.client_id
      staffId = apt.staff_id
      const service = services.find((s) => s.id === apt.service_id)
      amount = service ? service.default_price : 8500
      paymentDate = apt.scheduled_at
    } else {
      // Standalone payments (gift cards, package deals, tips, product sales)
      appointmentId = null
      const clientIndex = pseudoInt(1, 35, seed1)
      clientId = `client-${String(clientIndex).padStart(3, "0")}`
      const staffIndex = pseudoInt(1, 7, seed2)
      staffId = `staff-${String(staffIndex).padStart(3, "0")}`

      // Varied amounts for standalone: gift cards, product sales, package deals
      const standaloneAmounts = [
        2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000,
      ]
      amount = standaloneAmounts[seed3 % standaloneAmounts.length]

      const daysAgo = pseudoInt(1, 90, seed1)
      paymentDate = format(subDays(today, daysAgo), "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }

    // Payment method distribution: CARD 45%, CASH 25%, TRANSFER 25%, OTHER 5%
    let paymentMethod: Payment["payment_method"]
    const methodSeed = seed1 % 100
    if (methodSeed < 45) {
      paymentMethod = "CARD"
    } else if (methodSeed < 70) {
      paymentMethod = "CASH"
    } else if (methodSeed < 95) {
      paymentMethod = "TRANSFER"
    } else {
      paymentMethod = "OTHER"
    }

    // Status: 90% COMPLETED, 7% PENDING, 3% REFUNDED
    let status: Payment["status"]
    const statusSeed = seed2 % 100
    if (statusSeed < 90) {
      status = "COMPLETED"
    } else if (statusSeed < 97) {
      status = "PENDING"
    } else {
      status = "REFUNDED"
    }

    // Reference notes
    const referenceNotes = [
      "",
      "",
      "",
      "Regular session payment",
      "Paid with gift card balance",
      "Package deal - 5 sessions",
      "Corporate account billing",
      "Loyalty discount applied",
      "First visit promotional rate",
      "Tip included",
      "Insurance reimbursement",
      "",
      "",
    ]
    const referenceNote = referenceNotes[seed3 % referenceNotes.length]

    const createdAt = paymentDate

    payments.push({
      id: `pay-${String(i + 1).padStart(3, "0")}`,
      appointment_id: appointmentId,
      client_id: clientId,
      staff_id: staffId,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      status,
      reference_note: referenceNote,
      created_at: createdAt,
      updated_at: createdAt,
    })
  }

  // Sort by payment date descending
  payments.sort(
    (a, b) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  )

  return payments
}

export const payments = generatePayments()
