import "server-only"

import { headers } from "next/headers"
import type { Currency } from "@/lib/pricing"

// Geo headers set by common hosts / CDNs, checked in order.
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]

/** ISO 3166-1 alpha-2 code of the visitor's country, if the host provides one. */
export async function getVisitorCountry(): Promise<string | null> {
  const h = await headers()
  for (const name of COUNTRY_HEADERS) {
    const value = h.get(name)
    if (value && /^[A-Za-z]{2}$/.test(value)) return value.toUpperCase()
  }
  return null
}

/**
 * Pricing is in USD everywhere except Nigeria, which is billed in NGN.
 * `override` comes from `?region=ng` / `?region=intl` so visitors (and the
 * demo) can switch manually when geo detection is missing or wrong.
 */
export async function getPricingCurrency(override?: string | null): Promise<Currency> {
  const forced = override?.toLowerCase()
  if (forced === "ng") return "NGN"
  if (forced === "intl" || forced === "us") return "USD"
  return (await getVisitorCountry()) === "NG" ? "NGN" : "USD"
}
