import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"
import { demoAllowed } from "@/server/auth/config"
import { getSessionContext } from "@/server/context"

export const metadata: Metadata = { title: "Sign in | Spa.Inc" }

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired. Request a new code below.",
  no_account: "No account uses that email. Start a free trial instead.",
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const safeNext = next?.startsWith("/dashboard") ? next : undefined
  // Already signed in: straight to the dashboard
  const ctx = await getSessionContext()
  if (ctx && !ctx.isDemo) redirect(safeNext ?? "/dashboard")

  return (
    <AuthShell title="Sign in" subtitle="We'll email you a 6-digit code. No password to remember.">
      {error && ERRORS[error] && <p className="mb-4 rounded-md bg-destructive/5 p-3 text-sm text-destructive">{ERRORS[error]}</p>}
      <LoginForm next={safeNext} demoAvailable={demoAllowed()} />
    </AuthShell>
  )
}
