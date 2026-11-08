import Link from "next/link"
import { getPageContext } from "@/server/context"
import { NotFoundError } from "@/server/errors"
import { getClientProfile } from "@/server/services/clients"
import { dateKeyInZone } from "@/lib/time"
import { formatDate, formatPhone } from "@/lib/utils"
import { VisitHistory } from "@/components/clients/visit-history"
import { ClientStats } from "@/components/clients/client-stats"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { ArrowLeft, CalendarPlus, Mail, Phone, MapPin, Calendar, FileText } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getPageContext()
  const profile = await getClientProfile(ctx, id).catch((err) => {
    if (err instanceof NotFoundError) return null
    throw err
  })

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <p className="text-muted-foreground">
          The client you are looking for does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
      </div>
    )
  }

  const { client, stats, upcoming, past, timezone } = profile

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/dashboard/calendar?book=1&client=${client.id}`}>
            <CalendarPlus className="h-4 w-4" />
            Book appointment
          </Link>
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Client info card */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{client.full_name}</CardTitle>
                <StatusBadge status={stats.status} />
              </div>
              <CardDescription>Client details and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="text-sm">{client.email || "Not provided"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="text-sm">{formatPhone(client.phone)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Date of Birth</dt>
                    <dd className="text-sm">
                      {client.date_of_birth
                        ? formatDate(client.date_of_birth)
                        : "Not provided"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd className="text-sm">
                      {client.address || "Not provided"}
                    </dd>
                  </div>
                </div>
                {client.notes && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Notes</dt>
                      <dd className="text-sm">{client.notes}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Visit history */}
          <VisitHistory upcoming={upcoming} past={past} timezone={timezone} />
        </div>

        {/* Right column - Stats */}
        <div className="lg:col-span-1">
          <ClientStats stats={stats} memberSince={dateKeyInZone(client.created_at, timezone)} />
        </div>
      </div>
    </div>
  )
}
