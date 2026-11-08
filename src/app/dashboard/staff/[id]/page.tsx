import Link from "next/link"
import { ArrowLeft, CalendarDays, Mail, Phone, Users } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StaffStats } from "@/components/staff/staff-stats"
import { StaffRevenueChart } from "@/components/staff/staff-revenue-chart"
import { ScheduleGrid } from "@/components/staff/schedule-grid"
import { getInitials, formatCurrency, formatPhone, formatDate } from "@/lib/utils"
import { hasFeature } from "@/lib/plans"
import { NotFoundError } from "@/server/errors"
import { getPageContext } from "@/server/context"
import { getStaffProfile } from "@/server/services/users"

interface StaffDetailPageProps {
  params: Promise<{ id: string }>
}

async function loadProfile(id: string) {
  const ctx = await getPageContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "staffManagement")) return "locked" as const
  try {
    return await getStaffProfile(ctx, id)
  } catch (err) {
    if (err instanceof NotFoundError) return null
    throw err
  }
}

export default async function StaffDetailPage({ params }: StaffDetailPageProps) {
  const { id } = await params
  const profile = await loadProfile(id)
  if (profile === "locked") return null

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h1 className="text-2xl font-bold">Staff member not found</h1>
        <p className="text-muted-foreground">
          The staff member you are looking for does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/staff">
            <ArrowLeft className="h-4 w-4" />
            Back to Staff
          </Link>
        </Button>
      </div>
    )
  }

  const { staff, stats, weekly, schedule, clients: staffClients } = profile

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/staff">
            <ArrowLeft className="h-4 w-4" />
            Back to Staff
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/dashboard/calendar?view=week&staff=${staff.id}`}>
            <CalendarDays className="h-4 w-4" />
            {stats.upcoming > 0 ? `View calendar (${stats.upcoming} upcoming)` : "View calendar"}
          </Link>
        </Button>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar size="lg" className="h-16 w-16">
              <AvatarFallback className="bg-spa-light text-spa-accent text-xl font-semibold">
                {getInitials(staff.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{staff.full_name}</h1>
                <Badge
                  variant="secondary"
                  className={
                    staff.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  }
                >
                  {staff.role}
                </Badge>
                <StatusBadge status={staff.is_active ? "ACTIVE" : "INACTIVE"} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {staff.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhone(staff.phone)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <StaffStats stats={stats} />
          <StaffRevenueChart data={weekly} />
        </TabsContent>

        <TabsContent value="schedule" className="pt-4">
          <ScheduleGrid schedule={schedule} />
        </TabsContent>

        <TabsContent value="clients" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clients Served</CardTitle>
            </CardHeader>
            <CardContent>
              {staffClients.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffClients.map((client) => (
                        <TableRow key={client.clientId} className="even:bg-muted/50">
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/clients/${client.clientId}`} className="hover:underline">
                              {client.clientName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {client.visits}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(client.lastVisit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(client.spent)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<Users className="h-10 w-10" />}
                  title="No clients served yet"
                  description="Clients appear here after this therapist completes their first session."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
