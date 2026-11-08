import type { BusinessCurrency } from "@/types"

/** Countries a business can sign up from: currency and the timezones offered. */
export const COUNTRIES = [
  { code: "NG", name: "Nigeria", currency: "NGN", timezones: ["Africa/Lagos"] },
  { code: "GH", name: "Ghana", currency: "USD", timezones: ["Africa/Accra"] },
  { code: "KE", name: "Kenya", currency: "USD", timezones: ["Africa/Nairobi"] },
  { code: "ZA", name: "South Africa", currency: "USD", timezones: ["Africa/Johannesburg"] },
  { code: "GB", name: "United Kingdom", currency: "USD", timezones: ["Europe/London"] },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"],
  },
  {
    code: "CA",
    name: "Canada",
    currency: "USD",
    timezones: ["America/Toronto", "America/Winnipeg", "America/Edmonton", "America/Vancouver", "America/Halifax"],
  },
] as const satisfies readonly { code: string; name: string; currency: BusinessCurrency; timezones: readonly string[] }[]

export type CountryCode = (typeof COUNTRIES)[number]["code"]

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]]

export function countryFor(code: string) {
  return COUNTRIES.find((c) => c.code === code)
}

/** "America/Los_Angeles" -> "Los Angeles" */
export function timezoneLabel(tz: string) {
  return tz.split("/").pop()!.replace(/_/g, " ")
}
