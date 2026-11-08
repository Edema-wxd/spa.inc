import Link from "next/link"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { ClientsTable } from "@/components/clients/clients-table"
import { AddResourceButton } from "@/components/plan/add-resource-button"
import { LimitBanner } from "@/components/plan/limit-banner"
import { UsageMeter } from "@/components/plan/usage-meter"
import { getLimit } from "@/lib/plans"
import { getPageContext } from "@/server/context"
import { listClientRows } from "@/server/services/clients"

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const query = search?.trim() || undefined
  const ctx = await getPageContext()
  const [clients, total] = await Promise.all([
    listClientRows(ctx, query),
    query ? listClientRows(ctx).then((all) => all.length) : Promise.resolve(null),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your client directory">
        <div className="flex items-center gap-4">
          <UsageMeter
            resource="clients"
            used={total ?? clients.length}
            limit={getLimit(ctx.plan, "clients")}
            className="hidden w-48 sm:block"
          />
          <Button asChild variant="outline">
            <Link href="/dashboard/clients/import">
              <FileUp className="h-4 w-4" />
              Import
            </Link>
          </Button>
          <AddResourceButton resource="clients" label="Add Client" href="/dashboard/clients/new" />
        </div>
      </PageHeader>
      <LimitBanner resource="clients" />
      {query && (
        <p className="text-sm text-muted-foreground">
          {clients.length} result{clients.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;.{" "}
          <Link href="/dashboard/clients" className="text-spa-accent hover:underline">
            Show all clients
          </Link>
        </p>
      )}
      <ClientsTable clients={clients} />
    </div>
  )
}
