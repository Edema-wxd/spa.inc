import { userInviteSchema } from "@/lib/validation/users"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, route } from "@/server/http"
import { inviteUser, listTeam } from "@/server/services/users"

export const GET = route(async () => ok(await listTeam(await getRequestContext())))

export const POST = route(async (request) => {
  const input = await parseBody(request, userInviteSchema)
  return created(await inviteUser(await getRequestContext(), input), "Invitation sent")
})
