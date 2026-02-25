"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpensesByCategory } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const categoryDotColor: Record<string, string> = {
  SUPPLIES: "bg-blue-500",
  UTILITIES: "bg-amber-500",
  RENT: "bg-purple-500",
  PAYROLL: "bg-emerald-500",
  EQUIPMENT: "bg-orange-500",
  MARKETING: "bg-pink-500",
  OTHER: "bg-gray-400",
}

export function ExpenseBreakdown() {
  const data = getExpensesByCategory()
  const grandTotal = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const percentage =
                grandTotal > 0
                  ? ((item.total / grandTotal) * 100).toFixed(1)
                  : "0.0"
              const dotColor =
                categoryDotColor[item.category] || categoryDotColor.OTHER

              return (
                <TableRow key={item.category}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`}
                      />
                      <span className="text-sm font-medium">
                        {item.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(item.total)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {percentage}%
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="border-t-2">
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {formatCurrency(grandTotal)}
              </TableCell>
              <TableCell className="text-right font-bold">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
