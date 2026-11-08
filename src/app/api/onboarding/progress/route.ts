import { onboardingProgressSchema } from "@/lib/validation/onboarding"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { recordOnboardingProgress } from "@/server/services/onboarding"

export const POST = route(async (request) => {
  const { action } = await parseBody(request, onboardingProgressSchema)
  await recordOnboardingProgress(await getRequestContext(), action)
  return ok(null, "Saved")
})
