import { SettingsView } from "@/components/settings/settings-view"
import { SETTINGS_TABS } from "@/components/settings/tabs"
import { getRequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const ctx = await getRequestContext()
  const repos = await getRepositories()
  const [user, locations] = await Promise.all([
    repos.users.get(ctx.organizationId, ctx.userId),
    repos.locations.list(ctx.organizationId),
  ])
  const location = locations[0]

  return (
    <SettingsView
      defaultTab={SETTINGS_TABS.find((t) => t === tab) ?? "account"}
      adminUser={{ full_name: user?.full_name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
      business={{
        name: location?.name ?? "",
        address: location?.address ?? "",
        phone: location?.phone ?? "",
        timezone: location?.timezone ?? "UTC",
      }}
    />
  )
}
