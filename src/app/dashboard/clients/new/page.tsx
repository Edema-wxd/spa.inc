import { PageHeader } from "@/components/shared/page-header"
import { ClientForm } from "@/components/clients/client-form"
import { UpgradePrompt } from "@/components/plan/upgrade-prompt"
import { Card, CardContent } from "@/components/ui/card"
import { canAdd, formatCount, getLimit, minimumPlanForCount } from "@/lib/plans"
import { getRequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"

export default async function NewClientPage() {
  const ctx = await getRequestContext()
  const count = await (await getRepositories()).clients.count(ctx.organizationId)

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Client" description="Create a new client record" />
      {canAdd(ctx.plan, "clients", count) ? (
        <Card>
          <CardContent>
            <ClientForm />
          </CardContent>
        </Card>
      ) : (
        <UpgradePrompt
          title="Client limit reached"
          description={`Your plan includes up to ${formatCount("clients", getLimit(ctx.plan, "clients") ?? 0)}. Upgrade to keep growing your client directory.`}
          requiredPlan={minimumPlanForCount("clients", count + 1)}
        />
      )}
    </div>
  )
}
