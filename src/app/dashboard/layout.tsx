import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PlanProvider } from "@/components/plan/plan-provider"
import { getRequestContext } from "@/server/context"
import { getPlanUsage } from "@/server/services/plan"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const usage = await getPlanUsage(await getRequestContext())

  return (
    <PlanProvider value={usage}>
      <DashboardShell>{children}</DashboardShell>
    </PlanProvider>
  )
}
