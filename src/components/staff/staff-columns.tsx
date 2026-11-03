"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import type { StaffRow } from "@/server/services/users"
import { getInitials, formatCurrency } from "@/lib/utils"

export const staffColumns: ColumnDef<StaffRow>[] = [
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
    accessorKey: "sessions",
    cell: ({ row }) => {
      const count = row.original.sessions
      return <span className="tabular-nums">{count}</span>
    },
  },
  {
    id: "revenue",
    header: "Revenue",
    enableSorting: true,
    accessorKey: "revenue",
    cell: ({ row }) => {
      const revenue = row.original.revenue
      return <span className="tabular-nums">{formatCurrency(revenue)}</span>
    },
  },
  {
    id: "rating",
    header: "Rating",
    enableSorting: true,
    accessorFn: (row) => row.rating ?? 0,
    cell: ({ row }) => {
      const rating = row.original.rating
      if (rating === null) return <span className="text-muted-foreground">N/A</span>
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
