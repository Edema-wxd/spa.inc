import { LeaderboardTable } from "@/components/analytics/leaderboard-table"
import { PerformanceComparisonChart } from "@/components/charts/performance-comparison-chart"
import { PerformanceCard } from "@/components/analytics/performance-card"
import { PageHeader } from "@/components/shared/page-header"
import { RangeTabs } from "@/components/shared/range-tabs"
import { hasFeature } from "@/lib/plans"
import { isRangePreset } from "@/lib/ranges"
import { getPageContext } from "@/server/context"
import { getLeaderboardForPreset } from "@/server/services/analytics"

export default async function StaffPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const preset = isRangePreset(rangeParam) ? rangeParam : "30d"
  const ctx = await getPageContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "performanceLeaderboard")) return null
  const { range, rows } = await getLeaderboardForPreset(ctx, preset)

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Performance" description={`Rankings and comparisons for your team, ${range.label.toLowerCase()}`}>
        <RangeTabs basePath="/dashboard/analytics/performance" active={preset} />
      </PageHeader>

      <LeaderboardTable rows={rows} />
      <PerformanceComparisonChart rows={rows} />

      {rows.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Individual Performance</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((staff, index) => (
              <PerformanceCard key={staff.staffId} staff={staff} rank={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
