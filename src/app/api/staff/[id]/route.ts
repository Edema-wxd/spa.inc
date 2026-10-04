import { staffUpdateSchema } from "@/lib/validation/users"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { getStaff, updateStaff } from "@/server/services/users"

type Params = { id: string }

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  return ok(await getStaff(await getRequestContext(), id))
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, staffUpdateSchema)
  return ok(await updateStaff(await getRequestContext(), id, input), "Staff member updated")
})
