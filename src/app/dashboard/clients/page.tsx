import { PageHeader } from "@/components/shared/page-header"
import { ClientsTable } from "@/components/clients/clients-table"
import { AddResourceButton } from "@/components/plan/add-resource-button"
import { LimitBanner } from "@/components/plan/limit-banner"
import { UsageMeter } from "@/components/plan/usage-meter"
import { getLimit } from "@/lib/plans"
import { getRequestContext } from "@/server/context"
import { listClients } from "@/server/services/clients"

export default async function ClientsPage() {
  const ctx = await getRequestContext()
  const clients = await listClients(ctx)

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your client directory">
        <div className="flex items-center gap-4">
          <UsageMeter
            resource="clients"
            used={clients.length}
            limit={getLimit(ctx.plan, "clients")}
            className="hidden w-48 sm:block"
          />
          <AddResourceButton resource="clients" label="Add Client" href="/dashboard/clients/new" />
        </div>
      </PageHeader>
      <LimitBanner resource="clients" />
      <ClientsTable clients={clients} />
    </div>
  )
}
