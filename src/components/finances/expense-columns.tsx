"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { getStaffById } from "@/lib/mock-data"
import type { Expense } from "@/types"
import { CheckCircle2, Minus } from "lucide-react"

export type EnrichedExpense = Expense & {
  created_by_name: string
}

const categoryColorMap: Record<string, string> = {
  SUPPLIES: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  UTILITIES: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  RENT: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  PAYROLL: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  EQUIPMENT: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  MARKETING: "bg-pink-100 text-pink-700 hover:bg-pink-100",
  OTHER: "bg-gray-100 text-gray-600 hover:bg-gray-100",
}

export const expenseColumns: ColumnDef<EnrichedExpense>[] = [
  {
    accessorKey: "expense_date",
    header: "Date",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {formatDate(row.getValue("expense_date"))}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    enableSorting: false,
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      const colors = categoryColorMap[category] || categoryColorMap.OTHER
      return (
        <Badge
          variant="secondary"
          className={cn(colors, "font-medium")}
        >
          {category}
        </Badge>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="max-w-[250px] truncate text-sm" title={row.getValue("description")}>
        {row.getValue("description")}
      </span>
    ),
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
    accessorKey: "is_recurring",
    header: "Recurring",
    enableSorting: false,
    cell: ({ row }) => {
      const isRecurring = row.getValue("is_recurring") as boolean
      const interval = row.original.recurrence_interval
      return (
        <div className="flex items-center gap-1.5">
          {isRecurring ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">
                {interval?.charAt(0)}{interval?.slice(1).toLowerCase()}
              </span>
            </>
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "created_by_name",
    header: "Created By",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("created_by_name")}
      </span>
    ),
  },
]
