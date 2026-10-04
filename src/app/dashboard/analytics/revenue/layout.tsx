import { RequireFeature } from "@/components/plan/require-feature"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireFeature feature="revenueAnalytics">{children}</RequireFeature>
}
