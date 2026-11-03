"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { getInitials, formatDate, formatCurrency, formatPhone } from "@/lib/utils"
import type { ClientRow } from "@/server/services/clients"

export const clientColumns: ColumnDef<ClientRow>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    enableSorting: true,
    cell: ({ row }) => {
      const client = row.original
      return (
        <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 hover:underline">
          <Avatar size="sm">
            <AvatarFallback className="text-xs">{getInitials(client.full_name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{client.full_name}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    enableSorting: false,
    cell: ({ row }) => formatPhone(row.original.phone),
  },
  {
    accessorKey: "total_visits",
    header: "Visits",
    enableSorting: true,
    cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
  },
  {
    accessorKey: "total_spent",
    header: "Total Spent",
    enableSorting: true,
    cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(getValue<number>())}</span>,
  },
  {
    accessorKey: "last_visit",
    header: "Last Visit",
    enableSorting: true,
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const date = getValue<string | null>()
      return date ? formatDate(date) : <span className="text-muted-foreground">No visits</span>
    },
  },
  {
    accessorKey: "next_visit",
    header: "Next Visit",
    enableSorting: true,
    cell: ({ getValue }) => {
      const date = getValue<string | null>()
      return date ? formatDate(date) : <span className="text-muted-foreground">None booked</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]
