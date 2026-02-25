import { Expense } from "@/types"
import { subDays, format } from "date-fns"

function pseudoInt(min: number, max: number, seed: number): number {
  return min + (Math.abs(seed) % (max - min + 1))
}

function generateExpenses(): Expense[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expenses: Expense[] = []

  // Category distribution for 80 expenses:
  // PAYROLL 40% = 32, RENT 15% = 12, SUPPLIES 15% = 12, UTILITIES 10% = 8,
  // EQUIPMENT 8% = 6, MARKETING 7% = 6, OTHER 5% = 4
  // Total = 80

  interface ExpenseTemplate {
    category: Expense["category"]
    descriptions: string[]
    amountRange: [number, number]
    isRecurring: boolean
    recurrenceInterval: Expense["recurrence_interval"]
  }

  const templates: ExpenseTemplate[] = [
    // PAYROLL - 32 entries (4 weekly cycles x 8 staff, but simplified)
    ...Array.from({ length: 32 }, (_, i): ExpenseTemplate => {
      const staffNames = [
        "Maria Santos",
        "David Chen",
        "Aisha Patel",
        "James Okafor",
        "Elena Voronova",
        "Carlos Mendez",
        "Sophie Laurent",
        "Kenji Tanaka",
      ]
      return {
        category: "PAYROLL",
        descriptions: [`Bi-weekly payroll - ${staffNames[i % staffNames.length]}`],
        amountRange: [180000, 280000],
        isRecurring: true,
        recurrenceInterval: "MONTHLY",
      }
    }),
    // RENT - 12 entries (monthly rent x ~3 months, plus related)
    ...Array.from({ length: 12 }, (_, i): ExpenseTemplate => {
      const rentDescriptions = [
        "Monthly lease - Main spa location",
        "Monthly lease - Main spa location",
        "Monthly lease - Main spa location",
        "Parking lot lease",
        "Storage unit rental",
        "Equipment locker rental",
      ]
      return {
        category: "RENT",
        descriptions: [rentDescriptions[i % rentDescriptions.length]],
        amountRange:
          i % 6 < 3 ? [350000, 350000] : [15000, 45000],
        isRecurring: true,
        recurrenceInterval: "MONTHLY",
      }
    }),
    // SUPPLIES - 12 entries
    ...Array.from({ length: 12 }, (): ExpenseTemplate => ({
      category: "SUPPLIES",
      descriptions: [
        "Massage oils and lotions restock",
        "Clean towels and linens bulk order",
        "Essential oils - lavender, eucalyptus, peppermint",
        "Disposable face cradle covers",
        "Hand sanitizer and cleaning supplies",
        "Candles and incense for ambiance",
        "Hot stone replacement set",
        "Aromatherapy diffuser refills",
        "Paper products and tissue boxes",
        "Laundry detergent and softener",
        "Massage cream - hypoallergenic",
        "Reception desk supplies and stationery",
      ],
      amountRange: [5000, 20000],
      isRecurring: false,
      recurrenceInterval: null,
    })),
    // UTILITIES - 8 entries
    ...Array.from({ length: 8 }, (): ExpenseTemplate => ({
      category: "UTILITIES",
      descriptions: [
        "Electricity bill",
        "Water and sewage bill",
        "Natural gas bill",
        "Internet and phone service",
        "Waste removal service",
        "Security alarm monitoring",
        "HVAC maintenance contract",
        "Electricity bill",
      ],
      amountRange: [15000, 65000],
      isRecurring: true,
      recurrenceInterval: "MONTHLY",
    })),
    // EQUIPMENT - 6 entries
    ...Array.from({ length: 6 }, (): ExpenseTemplate => ({
      category: "EQUIPMENT",
      descriptions: [
        "New massage table - hydraulic adjustable",
        "Hot towel cabinet replacement",
        "Sound system upgrade for treatment rooms",
        "Portable massage chair for events",
        "UV sanitizer for tools",
        "New rolling stool set (3 units)",
      ],
      amountRange: [15000, 50000],
      isRecurring: false,
      recurrenceInterval: null,
    })),
    // MARKETING - 6 entries
    ...Array.from({ length: 6 }, (): ExpenseTemplate => ({
      category: "MARKETING",
      descriptions: [
        "Google Ads campaign - February",
        "Social media management service",
        "Printed flyers and brochures",
        "Yelp advertising subscription",
        "Local magazine ad placement",
        "Referral program gift card budget",
      ],
      amountRange: [10000, 30000],
      isRecurring: false,
      recurrenceInterval: null,
    })),
    // OTHER - 4 entries
    ...Array.from({ length: 4 }, (): ExpenseTemplate => ({
      category: "OTHER",
      descriptions: [
        "Business insurance premium",
        "Professional liability insurance",
        "Staff training workshop registration",
        "Annual business license renewal",
      ],
      amountRange: [8000, 45000],
      isRecurring: false,
      recurrenceInterval: null,
    })),
  ]

  for (let i = 0; i < 80; i++) {
    const template = templates[i]
    const seed1 = (i * 23 + 5) % 1000
    const seed2 = (i * 37 + 11) % 1000

    // Spread over last 90 days
    const daysAgo = pseudoInt(0, 89, seed1)
    const expenseDate = subDays(today, daysAgo)

    const [minAmt, maxAmt] = template.amountRange
    const amount = minAmt === maxAmt ? minAmt : pseudoInt(minAmt, maxAmt, seed2)

    const description =
      template.descriptions.length === 1
        ? template.descriptions[0]
        : template.descriptions[i % template.descriptions.length]

    // Assign creator: mostly admin-001, sometimes admin-002
    const createdBy = seed1 % 3 === 0 ? "admin-002" : "admin-001"

    expenses.push({
      id: `exp-${String(i + 1).padStart(3, "0")}`,
      category: template.category,
      description,
      amount,
      expense_date: format(expenseDate, "yyyy-MM-dd"),
      is_recurring: template.isRecurring,
      recurrence_interval: template.recurrenceInterval,
      receipt_url: seed2 % 3 === 0 ? null : `/receipts/exp-${String(i + 1).padStart(3, "0")}.pdf`,
      created_by: createdBy,
      created_at: format(expenseDate, "yyyy-MM-dd'T'10:00:00'Z'"),
      updated_at: format(expenseDate, "yyyy-MM-dd'T'10:00:00'Z'"),
    })
  }

  // Sort by expense_date descending
  expenses.sort(
    (a, b) =>
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
  )

  return expenses
}

export const expenses = generateExpenses()
