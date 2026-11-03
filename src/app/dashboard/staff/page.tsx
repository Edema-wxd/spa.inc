import { PageHeader } from "@/components/shared/page-header"
import { StaffTable } from "@/components/staff/staff-table"
import { hasFeature } from "@/lib/plans"
import { getRequestContext } from "@/server/context"
import { listStaffRows } from "@/server/services/users"

export default async function StaffPage() {
  const ctx = await getRequestContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "staffManagement")) return null
  const staff = await listStaffRows(ctx)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Your therapists, their sessions and lifetime revenue"
        action={{ label: "Open calendar", href: "/dashboard/calendar" }}
      />
      <StaffTable staff={staff} />
    </div>
  )
}
