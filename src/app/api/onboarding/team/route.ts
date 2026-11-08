import { teamMemberSchema } from "@/lib/validation/onboarding"
import { getRequestContext } from "@/server/context"
import { created, parseBody, route } from "@/server/http"
import { addTeamMember } from "@/server/services/onboarding"

/** Make the owner bookable, or add a therapist, with weekly hours. */
export const POST = route(async (request) => {
  const input = await parseBody(request, teamMemberSchema)
  const user = await addTeamMember(await getRequestContext(), input)
  return created({ id: user.id }, input.self ? "You're on the calendar" : `${user.full_name} added. They can sign in with ${user.email}.`)
})
