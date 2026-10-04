"use client"

import { LeaderboardTable } from "@/components/analytics/leaderboard-table"
import { PerformanceComparisonChart } from "@/components/charts/performance-comparison-chart"
import { PerformanceCard } from "@/components/analytics/performance-card"
import { getStaffLeaderboard } from "@/lib/mock-data"

const leaderboard = getStaffLeaderboard()

export default function StaffPerformancePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Staff Performance</h1>
        <p className="text-muted-foreground">
          Rankings, metrics, and comparisons for your spa team
        </p>
      </div>

      {/* Leaderboard Table */}
      <LeaderboardTable />

      {/* Performance Comparison Chart */}
      <div className="mt-6">
        <PerformanceComparisonChart />
      </div>

      {/* Staff Performance Cards Grid */}
      {leaderboard.length > 0 && (
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Individual Performance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaderboard.map((staff, index) => (
            <PerformanceCard
              key={staff.staffId}
              staff={staff}
              rank={index + 1}
            />
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
