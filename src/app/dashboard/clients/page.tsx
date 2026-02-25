"use client"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { clientColumns } from "@/components/clients/client-columns"
import { clients } from "@/lib/mock-data"

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client directory"
        action={{
          label: "Add Client",
          href: "/dashboard/clients/new",
        }}
      />
      <DataTable
        columns={clientColumns}
        data={clients}
        searchKey="full_name"
        searchPlaceholder="Search clients..."
      />
    </div>
  )
}
