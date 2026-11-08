import { serviceUpdateSchema } from "@/lib/validation/services"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { updateService } from "@/server/services/catalog"

/** Edit a treatment; `is_active: false` hides it from booking without losing history. */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, serviceUpdateSchema)
  return ok(await updateService(await getRequestContext(), id, input), "Treatment saved")
})
