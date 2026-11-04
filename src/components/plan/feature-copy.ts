import type { Feature } from "@/lib/plans"

/** Upgrade prompt copy for each gated feature. */
export const FEATURE_UPSELL: Record<Feature, { title: string; description: string }> = {
  onlineBooking: {
    title: "Online booking",
    description: "A booking page clients can use 24/7 from Instagram, WhatsApp or your website.",
  },
  deposits: {
    title: "Take deposits",
    description: "Ask for a deposit when clients book online. No-shows drop when there is money on the line.",
  },
  whatsappReminders: {
    title: "WhatsApp reminders",
    description: "Send confirmations and day-before reminders on WhatsApp. Clients reply 1 to confirm.",
  },
  staffManagement: {
    title: "Manage your team",
    description: "Add therapists, set their weekly schedules, and track their earnings.",
  },
  revenueAnalytics: {
    title: "Revenue analytics",
    description: "Break revenue down by service, therapist, and payment method.",
  },
  expenseTracking: {
    title: "Track your expenses",
    description: "Log rent, supplies, payroll and recurring costs to see where money goes.",
  },
  performanceLeaderboard: {
    title: "Staff performance leaderboard",
    description: "Rank therapists by revenue, sessions, and client satisfaction.",
  },
  profitAndLoss: {
    title: "Profit & Loss reports",
    description: "See revenue minus expenses month by month, with daily profit trends.",
  },
  emailConfirmations: {
    title: "Email confirmations",
    description: "Automatically email clients when an appointment is booked.",
  },
  multiLocation: {
    title: "Multiple locations",
    description: "Run several branches from one account with per-location reporting.",
  },
  consolidatedReporting: {
    title: "Consolidated reporting",
    description: "Compare performance across all of your branches in one view.",
  },
  guidedOnboarding: {
    title: "Guided onboarding",
    description: "Our team migrates your client records and sets up your account.",
  },
}
