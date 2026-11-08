import { clientImportSchema } from "@/lib/validation/client-import"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { importClients } from "@/server/services/clients"

/** Import clients parsed from a CSV in the browser. */
export const POST = route(async (request) => {
  const { rows } = await parseBody(request, clientImportSchema)
  const result = await importClients(await getRequestContext(), rows)
  return ok(result, `Imported ${result.created} client${result.created === 1 ? "" : "s"}`)
})
