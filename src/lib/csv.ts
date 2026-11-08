/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), commas and
 * newlines inside quotes, CRLF, a UTF-8 BOM, and ; or tab separators
 * (spreadsheet exports in some locales).
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "")
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ""
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0]

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"' && field === "") {
      quoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += ch
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

export type ClientField = "full_name" | "first_name" | "last_name" | "phone" | "email" | "notes" | "date_of_birth"

const HEADER_ALIASES: Record<ClientField, string[]> = {
  full_name: ["name", "full name", "fullname", "client", "client name", "customer", "customer name", "display name"],
  first_name: ["first name", "firstname", "given name"],
  last_name: ["last name", "lastname", "surname", "family name"],
  phone: ["phone", "phone number", "mobile", "mobile number", "mobile phone", "cell", "telephone", "tel", "whatsapp", "phone 1 - value"],
  email: ["email", "e-mail", "email address", "e-mail address", "e-mail 1 - value", "email 1 - value"],
  notes: ["notes", "note", "comments", "comment", "preferences"],
  date_of_birth: ["birthday", "date of birth", "dob", "birth date"],
}

/** Guesses which column holds which field from the header row. */
export function guessColumns(header: string[]): Partial<Record<ClientField, number>> {
  const result: Partial<Record<ClientField, number>> = {}
  header.forEach((raw, index) => {
    const h = raw.trim().toLowerCase().replace(/\s+/g, " ")
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [ClientField, string[]][]) {
      if (result[field] === undefined && aliases.includes(h)) result[field] = index
    }
  })
  return result
}
