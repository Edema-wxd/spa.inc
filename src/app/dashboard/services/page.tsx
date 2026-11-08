import { PageHeader } from "@/components/shared/page-header"
import { ServicesManager } from "@/components/services/services-manager"
import { getPageContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"
import { listServices } from "@/server/services/catalog"

export default async function ServicesPage() {
  const ctx = await getPageContext()
  const [services, org] = await Promise.all([
    listServices(ctx),
    getRepositories().then((repos) => repos.organizations.get(ctx.organizationId)),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Services" description="Your treatment menu: what clients can book, how long it takes, and what it costs." />
      <ServicesManager services={services} currency={org?.currency ?? "USD"} />
    </div>
  )
}
