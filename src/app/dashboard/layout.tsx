import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PlanProvider } from "@/components/plan/plan-provider"
import { getPageContext } from "@/server/context"
import { SessionUserProvider } from "@/components/layout/session-user"
import { getRepositories } from "@/server/repositories"
import { getPlanUsage } from "@/server/services/plan"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPageContext()
  const [usage, user] = await Promise.all([
    getPlanUsage(ctx),
    getRepositories().then((repos) => repos.users.get(ctx.organizationId, ctx.userId)),
  ])

  return (
    <PlanProvider value={usage}>
      <SessionUserProvider
        value={{ full_name: user?.full_name ?? "Account", email: user?.email ?? "", role: ctx.role }}
      >
        <DashboardShell>{children}</DashboardShell>
      </SessionUserProvider>
    </PlanProvider>
  )
}
