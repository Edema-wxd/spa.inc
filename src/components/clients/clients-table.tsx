"use client"

import { Users } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { clientColumns } from "@/components/clients/client-columns"
import type { Client } from "@/types"

export function ClientsTable({ clients }: { clients: Client[] }) {
  return (
    <DataTable
      columns={clientColumns}
      data={clients}
      searchKey="full_name"
      searchPlaceholder="Search clients..."
      emptyState={
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No clients yet"
          description="Add your first client to start tracking visits, preferences, and payments."
          action={{ label: "Add Client", href: "/dashboard/clients/new" }}
        />
      }
    />
  )
}
