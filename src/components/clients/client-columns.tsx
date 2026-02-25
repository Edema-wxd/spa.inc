"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { getInitials, formatDate, formatCurrency, formatPhone } from "@/lib/utils"
import { appointments, payments } from "@/lib/mock-data"

export const clientColumns: ColumnDef<Client>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    enableSorting: true,
    cell: ({ row }) => {
      const client = row.original
      return (
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar size="sm">
            <AvatarFallback className="text-xs">
              {getInitials(client.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{client.full_name}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: false,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    enableSorting: false,
    cell: ({ row }) => formatPhone(row.original.phone),
  },
  {
    id: "totalVisits",
    header: "Total Visits",
    enableSorting: true,
    accessorFn: (row) =>
      appointments.filter((a) => a.client_id === row.id).length,
    cell: ({ getValue }) => getValue<number>(),
  },
  {
    id: "totalSpent",
    header: "Total Spent",
    enableSorting: true,
    accessorFn: (row) =>
      payments
        .filter((p) => p.client_id === row.id && p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0),
    cell: ({ getValue }) => formatCurrency(getValue<number>()),
  },
  {
    id: "lastVisit",
    header: "Last Visit",
    enableSorting: true,
    accessorFn: (row) => {
      const clientAppointments = appointments
        .filter(
          (a) =>
            a.client_id === row.id &&
            (a.status === "COMPLETED" || a.status === "SCHEDULED")
        )
        .sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime()
        )
      return clientAppointments[0]?.scheduled_at || null
    },
    cell: ({ getValue }) => {
      const date = getValue<string | null>()
      return date ? formatDate(date) : "No visits"
    },
  },
  {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: () => <StatusBadge status="ACTIVE" />,
  },
]
