import { NextResponse } from "next/server"
import { exchangeMagicLink } from "@/server/auth"
import { completeSignIn } from "@/server/services/accounts"

/**
 * Supabase magic link landing: the email can contain a link as well as the
 * code. Exchanges the link's code for a session, then finishes sign-in (or
 * sign-up, when started in this browser).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const identity = code ? await exchangeMagicLink(code) : null
  if (!identity) return NextResponse.redirect(new URL("/login?error=link", url))
  try {
    const { redirect } = await completeSignIn(identity)
    return NextResponse.redirect(new URL(redirect, url))
  } catch {
    return NextResponse.redirect(new URL("/login?error=no_account", url))
  }
}
