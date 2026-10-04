import Link from "next/link"
import { ArrowLeft, Mail, Phone, Users } from "lucide-react"
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
import {
  users,
  appointments,
  payments,
  getClientById,
} from "@/lib/mock-data"
import {
  getInitials,
  formatCurrency,
  formatPhone,
  formatDate,
} from "@/lib/utils"

interface StaffDetailPageProps {
  params: Promise<{ id: string }>
}

function getStaffClients(staffId: string) {
  // Get all completed appointments for this staff
  const staffAppointments = appointments.filter(
    (a) => a.staff_id === staffId && a.status === "COMPLETED"
  )

  // Group by client
  const clientMap: Record<
    string,
    { clientId: string; visitCount: number; lastVisit: string; totalSpent: number }
  > = {}

  staffAppointments.forEach((apt) => {
    if (!clientMap[apt.client_id]) {
      clientMap[apt.client_id] = {
        clientId: apt.client_id,
        visitCount: 0,
        lastVisit: apt.scheduled_at,
        totalSpent: 0,
      }
    }

    clientMap[apt.client_id].visitCount += 1

    // Track the most recent visit
    if (apt.scheduled_at > clientMap[apt.client_id].lastVisit) {
      clientMap[apt.client_id].lastVisit = apt.scheduled_at
    }
  })

  // Add payment amounts per client-staff
  payments
    .filter((p) => p.staff_id === staffId && p.status === "COMPLETED")
    .forEach((p) => {
      if (clientMap[p.client_id]) {
        clientMap[p.client_id].totalSpent += p.amount
      }
    })

  // Convert to array and sort by visit count descending
  return Object.values(clientMap)
    .map((entry) => {
      const client = getClientById(entry.clientId)
      return {
        ...entry,
        clientName: client?.full_name || "Unknown Client",
      }
    })
    .sort((a, b) => b.visitCount - a.visitCount)
}

export default async function StaffDetailPage({ params }: StaffDetailPageProps) {
  const { id } = await params
  const staff = users.find((u) => u.id === id)

  if (!staff) {
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

  const staffClients = getStaffClients(staff.id)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/staff">
          <ArrowLeft className="h-4 w-4" />
          Back to Staff
        </Link>
      </Button>

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
          <StaffStats staffId={staff.id} />
          <StaffRevenueChart staffId={staff.id} />
        </TabsContent>

        <TabsContent value="schedule" className="pt-4">
          <ScheduleGrid staffId={staff.id} />
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
                            {client.clientName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {client.visitCount}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(client.lastVisit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(client.totalSpent)}
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
