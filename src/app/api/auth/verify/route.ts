import { verifyCodeSchema } from "@/lib/validation/accounts"
import { ok, parseBody, route } from "@/server/http"
import { verifyCode } from "@/server/services/accounts"

/** Step 2: check the code, start the session, and create the business for a new sign-up. */
export const POST = route(async (request) => {
  const { email, code, next } = await parseBody(request, verifyCodeSchema)
  const result = await verifyCode(email, code, next)
  return ok(result, result.created ? "Your account is ready" : "Signed in")
})
