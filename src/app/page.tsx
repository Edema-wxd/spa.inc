import Link from "next/link"
import { Sparkles, Users, BarChart3, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Users,
    title: "Client Tracking",
    description:
      "Manage client profiles, preferences, and appointment history in one centralized system.",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    description:
      "Track revenue, expenses, and profitability with real-time charts and detailed reports.",
  },
  {
    icon: UserCog,
    title: "Staff Management",
    description:
      "Coordinate schedules, monitor performance, and optimize your team's productivity.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-spa-primary to-spa-accent px-4 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Logo and Heading */}
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-10 w-10 text-white" />
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Spa.Inc
          </h1>
        </div>

        {/* Tagline */}
        <p className="mb-4 text-xl font-medium text-white/90">
          Wellness Management Dashboard
        </p>

        {/* Description */}
        <p className="mb-8 max-w-lg text-base leading-relaxed text-white/75">
          A comprehensive platform for managing your spa business. Track
          appointments, monitor revenue, manage staff schedules, and deliver
          exceptional client experiences -- all from one dashboard.
        </p>

        {/* Action Buttons */}
        <div className="mb-16 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-white text-spa-primary hover:bg-white/90"
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-white/10 bg-white/10 backdrop-blur-sm"
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 rounded-full bg-white/20 p-3">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
