"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { guessColumns, parseCsv, type ClientField } from "@/lib/csv"
import { MAX_IMPORT_ROWS, type ClientImportResult, type ClientImportRow } from "@/lib/validation/client-import"

const FIELDS: { key: ClientField; label: string; required?: boolean }[] = [
  { key: "full_name", label: "Full name" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
  { key: "date_of_birth", label: "Date of birth" },
]
const NONE = "none"

export function ClientImport() {
  const router = useRouter()
  const [fileName, setFileName] = useState<string | null>(null)
  const [header, setHeader] = useState<string[]>([])
  const [body, setBody] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Partial<Record<ClientField, number>>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ClientImportResult | null>(null)

  async function load(file: File) {
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return toast.error("That file has no rows under the header")
    setFileName(file.name)
    setHeader(rows[0])
    setBody(rows.slice(1))
    setMapping(guessColumns(rows[0]))
    setResult(null)
  }

  const cell = (row: string[], field: ClientField) => {
    const index = mapping[field]
    return index === undefined ? "" : (row[index] ?? "").trim()
  }
  const toRow = (row: string[]): ClientImportRow => ({
    full_name: cell(row, "full_name") || [cell(row, "first_name"), cell(row, "last_name")].filter(Boolean).join(" "),
    phone: cell(row, "phone"),
    email: cell(row, "email"),
    notes: cell(row, "notes"),
    date_of_birth: cell(row, "date_of_birth"),
  })
  const hasName = mapping.full_name !== undefined || mapping.first_name !== undefined
  const ready = hasName && mapping.phone !== undefined

  async function runImport() {
    setImporting(true)
    try {
      const { data, message } = await apiFetch<ClientImportResult>("/api/clients/import", {
        method: "POST",
        body: { rows: body.slice(0, MAX_IMPORT_ROWS).map(toRow) },
      })
      setResult(data)
      toast.success(message)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Imported {result.created} client{result.created === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {result.duplicates > 0 && <li>{result.duplicates} skipped: phone number already in your client list</li>}
            {result.overLimit > 0 && (
              <li>
                {result.overLimit} not imported: your plan&apos;s client limit is reached.{" "}
                <Link href="/dashboard/settings?tab=plan" className="text-spa-accent hover:underline">
                  See plans
                </Link>
              </li>
            )}
            {result.failed.slice(0, 10).map((f) => (
              <li key={f.row}>
                Row {f.row}: {f.reason}
              </li>
            ))}
            {result.failed.length > 10 && <li>and {result.failed.length - 10} more rows with problems</li>}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button asChild>
              <Link href="/dashboard/clients">View clients</Link>
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setFileName(null); setBody([]) }}>
              Import another file
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Choose a CSV file</CardTitle>
          <CardDescription>
            Export from your old booking system, a spreadsheet, or Google Contacts (Export, Google CSV). Each row needs a name and
            a phone number. Up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} rows at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center hover:border-spa-accent">
            <FileUp className="h-8 w-8 text-spa-accent" />
            <span className="font-medium">{fileName ?? "Choose a .csv file"}</span>
            {fileName && <span className="text-sm text-muted-foreground">{body.length} rows found</span>}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void load(file)
              }}
            />
          </label>
        </CardContent>
      </Card>

      {header.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Check the columns</CardTitle>
            <CardDescription>We matched what we could. Fix anything that&apos;s wrong.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] === undefined ? NONE : String(mapping[f.key])}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? undefined : Number(v) }))}
                  >
                    <SelectTrigger className="w-full" aria-label={f.label}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not in this file</SelectItem>
                      {header.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Column ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!ready && <p className="text-sm text-destructive">Choose the name (or first name) and phone columns.</p>}

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {body.slice(0, 5).map((row, i) => {
                    const r = toRow(row)
                    return (
                      <TableRow key={i}>
                        <TableCell>{r.full_name || <span className="text-destructive">missing</span>}</TableCell>
                        <TableCell>{r.phone || <span className="text-destructive">missing</span>}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell className="max-w-48 truncate">{r.notes}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Showing the first {Math.min(5, body.length)} of {body.length} rows.</p>

            <Button onClick={runImport} disabled={!ready || importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {Math.min(body.length, MAX_IMPORT_ROWS)} clients
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
