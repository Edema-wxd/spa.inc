import { getRequestContext } from "@/server/context"
import { ok, route } from "@/server/http"
import { getClientHistory } from "@/server/services/clients"

export const GET = route<{ id: string }>(async (_request, { params }) => {
  const { id } = await params
  return ok(await getClientHistory(await getRequestContext(), id))
})
