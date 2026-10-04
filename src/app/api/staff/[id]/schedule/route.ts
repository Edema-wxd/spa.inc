import { scheduleSchema } from "@/lib/validation/users"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { getStaffSchedule, updateStaffSchedule } from "@/server/services/users"

type Params = { id: string }

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  return ok(await getStaffSchedule(await getRequestContext(), id))
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, scheduleSchema)
  return ok(await updateStaffSchedule(await getRequestContext(), id, input), "Schedule updated")
})
