import { loginSchema } from "@/lib/validation/accounts"
import { ok, parseBody, route } from "@/server/http"
import { startLogin } from "@/server/services/accounts"

/** Email a sign-in code. In production the reply is the same whether or not the email has an account. */
export const POST = route(async (request) => {
  const { email } = await parseBody(request, loginSchema)
  return ok(await startLogin(email), "If this email has an account, a 6-digit code is on its way")
})
