"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { type User } from "@/types"
import { getInitials, formatCurrency } from "@/lib/utils"
import { appointments, payments } from "@/lib/mock-data"

function getStaffSessionCount(staffId: string): number {
  return appointments.filter(
    (a) => a.staff_id === staffId && a.status === "COMPLETED"
  ).length
}

function getStaffRevenue(staffId: string): number {
  return payments
    .filter((p) => p.staff_id === staffId && p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0)
}

function getStaffRating(staffId: string): number {
  const rated = appointments.filter(
    (a) =>
      a.staff_id === staffId &&
      a.status === "COMPLETED" &&
      a.satisfaction_rating !== null
  )
  if (rated.length === 0) return 0
  const total = rated.reduce((sum, a) => sum + (a.satisfaction_rating as number), 0)
  return Math.round((total / rated.length) * 10) / 10
}

export const staffColumns: ColumnDef<User>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    enableSorting: true,
    cell: ({ row }) => {
      const user = row.original
      return (
        <Link
          href={`/dashboard/staff/${user.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar size="default">
            <AvatarFallback className="bg-spa-light text-spa-accent text-xs font-medium">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.full_name}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <Badge
          variant={role === "ADMIN" ? "default" : "secondary"}
          className={
            role === "ADMIN"
              ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
              : "bg-blue-100 text-blue-700 hover:bg-blue-100"
          }
        >
          {role}
        </Badge>
      )
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active
      return <StatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} />
    },
  },
  {
    id: "sessions",
    header: "Sessions",
    enableSorting: true,
    accessorFn: (row) => getStaffSessionCount(row.id),
    cell: ({ row }) => {
      const count = getStaffSessionCount(row.original.id)
      return <span className="tabular-nums">{count}</span>
    },
  },
  {
    id: "revenue",
    header: "Revenue",
    enableSorting: true,
    accessorFn: (row) => getStaffRevenue(row.id),
    cell: ({ row }) => {
      const revenue = getStaffRevenue(row.original.id)
      return <span className="tabular-nums">{formatCurrency(revenue)}</span>
    },
  },
  {
    id: "rating",
    header: "Rating",
    enableSorting: true,
    accessorFn: (row) => getStaffRating(row.id),
    cell: ({ row }) => {
      const rating = getStaffRating(row.original.id)
      if (rating === 0) return <span className="text-muted-foreground">N/A</span>
      return <span className="tabular-nums">{rating} &#9733;</span>
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
]
