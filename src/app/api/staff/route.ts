import { userInviteSchema } from "@/lib/validation/users"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, route } from "@/server/http"
import { createStaff, listStaff } from "@/server/services/users"

export const GET = route(async () => ok(await listStaff(await getRequestContext())))

export const POST = route(async (request) => {
  const input = await parseBody(request, userInviteSchema.omit({ role: true }))
  return created(await createStaff(await getRequestContext(), input), "Staff member added")
})
