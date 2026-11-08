import { PageHeader } from "@/components/shared/page-header"
import { ClientImport } from "@/components/clients/client-import"
import { getPageContext } from "@/server/context"

export default async function ImportClientsPage() {
  await getPageContext()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import clients"
        description="Bring your client list over in one go. Duplicates (same phone number) are skipped."
      />
      <ClientImport />
    </div>
  )
}
