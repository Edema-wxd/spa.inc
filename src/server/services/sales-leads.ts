import "server-only"

import type { SalesLeadInput } from "@/lib/validation/sales-leads"
import { getVisitorCountry } from "@/lib/region"
import { getRepositories } from "@/server/repositories"
import { notifySalesTeam } from "@/server/services/notifications"

/** Public: stores a /contact-sales enquiry and alerts the sales team. */
export async function submitSalesLead(input: SalesLeadInput) {
  const { salesLeads } = await getRepositories()
  const lead = await salesLeads.create({ ...input, countryCode: await getVisitorCountry() })
  await notifySalesTeam(lead.id, lead.business_name)
  return lead
}
