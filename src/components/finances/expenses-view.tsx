"use client"

import { useState } from "react"
import { Plus, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { expenseColumns, type EnrichedExpense } from "@/components/finances/expense-columns"
import { ExpenseForm } from "@/components/finances/expense-form"

/** Expense log with the Add Expense dialog. Metrics are rendered by the server page. */
export function ExpensesView({
  rows,
  today,
  summary,
}: {
  rows: EnrichedExpense[]
  today: string
  summary: React.ReactNode
}) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track and manage business expenses">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </PageHeader>

      {summary}

      <DataTable
        columns={expenseColumns}
        data={rows}
        searchKey="description"
        searchPlaceholder="Search by description..."
        emptyState={
          <EmptyState
            icon={<Receipt className="h-12 w-12" />}
            title="No expenses yet"
            description="Use Add Expense to log rent, supplies, payroll and other costs."
          />
        }
      />

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} today={today} />
    </div>
  )
}
