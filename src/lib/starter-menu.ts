import type { BusinessCurrency } from "@/types"

/**
 * A typical massage and spa menu new businesses can start from, with
 * suggested prices per currency (minor units). Owners edit prices before
 * adding them. Suggestions only: local prices vary widely.
 */
export const STARTER_MENU: {
  key: string
  name: string
  description: string
  duration: number
  price: Record<BusinessCurrency, number>
}[] = [
  { key: "swedish-60", name: "Swedish Massage", description: "Full-body relaxation massage with long, flowing strokes.", duration: 60, price: { USD: 8500, NGN: 2500000 } },
  { key: "deep-60", name: "Deep Tissue Massage", description: "Firm pressure for knots and chronic tension.", duration: 60, price: { USD: 9500, NGN: 3000000 } },
  { key: "deep-90", name: "Deep Tissue Massage (90 min)", description: "Extra time on problem areas.", duration: 90, price: { USD: 13000, NGN: 4200000 } },
  { key: "hot-stone", name: "Hot Stone Massage", description: "Heated stones to melt away muscle tension.", duration: 90, price: { USD: 12000, NGN: 4000000 } },
  { key: "aromatherapy", name: "Aromatherapy Massage", description: "Gentle massage with essential oils.", duration: 60, price: { USD: 9000, NGN: 2800000 } },
  { key: "sports", name: "Sports Massage", description: "Targeted work for active bodies and recovery.", duration: 60, price: { USD: 10000, NGN: 3000000 } },
  { key: "prenatal", name: "Prenatal Massage", description: "Side-lying massage for comfort during pregnancy.", duration: 60, price: { USD: 9000, NGN: 2800000 } },
  { key: "reflexology", name: "Reflexology", description: "Pressure-point foot treatment.", duration: 45, price: { USD: 6500, NGN: 1800000 } },
  { key: "couples", name: "Couples Massage", description: "Side-by-side massage for two.", duration: 90, price: { USD: 18000, NGN: 6000000 } },
  { key: "express", name: "Express Massage", description: "Quick back, neck and shoulders.", duration: 30, price: { USD: 4500, NGN: 1200000 } },
  { key: "facial", name: "Signature Facial", description: "Cleanse, exfoliate, mask and moisturize.", duration: 60, price: { USD: 8000, NGN: 2500000 } },
  { key: "body-scrub", name: "Body Scrub", description: "Full-body exfoliation and hydration.", duration: 45, price: { USD: 7000, NGN: 2200000 } },
]

/** Pre-ticked for a new account. */
export const STARTER_DEFAULTS = ["swedish-60", "deep-60", "hot-stone", "reflexology"]
