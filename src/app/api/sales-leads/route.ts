import { salesLeadSchema } from "@/lib/validation/sales-leads"
import { created, parseBody, route } from "@/server/http"
import { submitSalesLead } from "@/server/services/sales-leads"

export const POST = route(async (request) => {
  const input = await parseBody(request, salesLeadSchema)
  const lead = await submitSalesLead(input)
  return created({ id: lead.id }, "Thanks! Our sales team will be in touch within one business day.")
})
