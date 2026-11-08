import { signupSchema } from "@/lib/validation/accounts"
import { ok, parseBody, route } from "@/server/http"
import { startSignup } from "@/server/services/accounts"

/** Step 1 of sign-up: keep the details and email a sign-in code (shown on screen in demo mode). */
export const POST = route(async (request) => {
  const input = await parseBody(request, signupSchema)
  return ok(await startSignup(input), "Check your email for a 6-digit code")
})
