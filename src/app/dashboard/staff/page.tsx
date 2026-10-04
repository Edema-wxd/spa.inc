import { PageHeader } from "@/components/shared/page-header"
import { UserCog } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { staffColumns } from "@/components/staff/staff-columns"
import { users } from "@/lib/mock-data"

export default function StaffPage() {
  const staffUsers = users.filter((u) => u.role === "STAFF")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage your massage therapists"
      />
      <DataTable
        columns={staffColumns}
        data={staffUsers}
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
    </div>
  )
}
