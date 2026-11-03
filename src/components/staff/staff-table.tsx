"use client"

import { UserCog } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { staffColumns } from "@/components/staff/staff-columns"
import type { StaffRow } from "@/server/services/users"

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  return (
    <DataTable
      columns={staffColumns}
      data={staff}
      searchKey="full_name"
      searchPlaceholder="Search staff..."
      emptyState={
        <EmptyState
          icon={<UserCog className="h-12 w-12" />}
          title="No therapists yet"
          description="Invite your therapists from Settings to manage their schedules and earnings."
          action={{ label: "Invite Team Members", href: "/dashboard/settings?tab=team" }}
        />
      }
    />
  )
}
