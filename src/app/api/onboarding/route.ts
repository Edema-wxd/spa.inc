import { getRequestContext } from "@/server/context"
import { ok, route } from "@/server/http"
import { getOnboarding } from "@/server/services/onboarding"

export const GET = route(async () => ok(await getOnboarding(await getRequestContext())))
