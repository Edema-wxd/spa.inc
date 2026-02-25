import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
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
      />
    </div>
  )
}
