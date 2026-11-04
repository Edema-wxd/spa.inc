// Phone numbers arrive in every format ("(512) 555-0100", "0803 123 4567",
// "+234 803..."). Matching and WhatsApp delivery need a canonical form.

const CALLING_CODES: Record<string, string> = { US: "1", CA: "1", NG: "234", GB: "44", GH: "233", KE: "254", ZA: "27" }

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "")
}

/** Storage form: digits only, keeping a leading "+" for international numbers. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const digits = phoneDigits(trimmed)
  return trimmed.startsWith("+") ? `+${digits}` : digits
}

/** Key for matching the same person across formats: the last 10 digits. */
export function phoneMatchKey(phone: string): string {
  return phoneDigits(phone).slice(-10)
}

/**
 * E.164 digits without the "+" (what the WhatsApp Cloud API expects), using
 * the business's country for numbers written in local format.
 */
export function toE164(phone: string, countryCode: string): string {
  const trimmed = phone.trim()
  const digits = phoneDigits(trimmed)
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) return digits.replace(/^00/, "")
  const code = CALLING_CODES[countryCode.toUpperCase()] ?? "1"
  if (code === "1") return digits.length === 10 ? `1${digits}` : digits
  // Local numbers drop the trunk prefix 0 ("0803..." -> "234803...")
  if (digits.startsWith(code)) return digits
  return `${code}${digits.replace(/^0/, "")}`
}
