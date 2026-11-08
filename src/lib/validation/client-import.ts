import { z } from "zod"

export const MAX_IMPORT_ROWS = 2000

export const clientImportSchema = z.object({
  rows: z
    .array(
      z.object({
        full_name: z.string().max(120),
        phone: z.string().max(40),
        email: z.string().max(200).optional(),
        notes: z.string().max(2000).optional(),
        date_of_birth: z.string().max(40).optional(),
      })
    )
    .min(1, "The file has no clients")
    .max(MAX_IMPORT_ROWS, `Import up to ${MAX_IMPORT_ROWS} clients at a time`),
})

export type ClientImportRow = z.infer<typeof clientImportSchema>["rows"][number]

export interface ClientImportResult {
  created: number
  duplicates: number
  overLimit: number
  failed: { row: number; reason: string }[]
}
