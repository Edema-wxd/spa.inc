"use client"

import { PageHeader } from "@/components/shared/page-header"
import { ClientForm } from "@/components/clients/client-form"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Client"
        description="Create a new client record"
      />
      <Card>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  )
}
