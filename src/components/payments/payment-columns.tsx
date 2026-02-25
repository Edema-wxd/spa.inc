"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { getClientById, getStaffById } from "@/lib/mock-data"
import type { Payment } from "@/types"

export type EnrichedPayment = Payment & {
  client_name: string
}

const methodColorMap: Record<string, string> = {
  CARD: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  CASH: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  TRANSFER: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  OTHER: "bg-gray-100 text-gray-600 hover:bg-gray-100",
}

export const paymentColumns: ColumnDef<EnrichedPayment>[] = [
  {
    accessorKey: "payment_date",
    header: "Date",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {formatDate(row.getValue("payment_date"))}
      </span>
    ),
  },
  {
    accessorKey: "client_name",
    header: "Client",
    enableSorting: false,
    cell: ({ row }) => {
      const clientId = row.original.client_id
      const clientName = row.getValue("client_name") as string
      return (
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="font-medium text-primary hover:underline"
        >
          {clientName}
        </Link>
      )
    },
  },
  {
    accessorKey: "staff_id",
    header: "Staff",
    enableSorting: false,
    cell: ({ row }) => {
      const staff = getStaffById(row.getValue("staff_id"))
      return (
        <span className="text-sm text-muted-foreground">
          {staff?.full_name || "Unknown"}
        </span>
      )
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatCurrency(row.getValue("amount"))}
      </span>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    enableSorting: false,
    cell: ({ row }) => {
      const method = row.getValue("payment_method") as string
      const colors = methodColorMap[method] || methodColorMap.OTHER
      return (
        <Badge
          variant="secondary"
          className={cn(colors, "font-medium")}
        >
          {method}
        </Badge>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "reference_note",
    header: "Reference",
    enableSorting: false,
    cell: ({ row }) => {
      const note = row.getValue("reference_note") as string
      if (!note) return <span className="text-muted-foreground">-</span>
      return (
        <span className="max-w-[200px] truncate text-sm text-muted-foreground" title={note}>
          {note}
        </span>
      )
    },
  },
]
