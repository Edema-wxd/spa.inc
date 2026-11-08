import { signOut } from "@/server/auth"
import { ok, route } from "@/server/http"

export const POST = route(async () => {
  await signOut()
  return ok({ redirect: "/login" }, "Signed out")
})
