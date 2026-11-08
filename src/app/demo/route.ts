import { NextResponse } from "next/server"
import { startDemoSession } from "@/server/auth"
import { demoAllowed, DEMO_OWNER_IDENTITY } from "@/server/auth/config"
import { getRepositories } from "@/server/repositories"
import { DEMO_ORGANIZATION_ID } from "@/server/demo/seed"

/**
 * "Explore the demo": signs the visitor in as the owner of the demo spa
 * (Juniper Day Spa) and opens the dashboard. Only where the demo store exists.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  if (!demoAllowed()) return NextResponse.redirect(new URL("/signup", url))
  const { users } = await getRepositories()
  const owner = await users.get(DEMO_ORGANIZATION_ID, "admin-001")
  if (!owner) return NextResponse.redirect(new URL("/signup", url))
  if (owner.auth_user_id !== DEMO_OWNER_IDENTITY) {
    await users.linkAuthUser(DEMO_ORGANIZATION_ID, owner.id, DEMO_OWNER_IDENTITY)
  }
  await startDemoSession({ authUserId: DEMO_OWNER_IDENTITY, email: owner.email })
  return NextResponse.redirect(new URL("/dashboard", url))
}
