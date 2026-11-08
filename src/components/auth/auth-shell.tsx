import Link from "next/link"
import { Sparkles } from "lucide-react"

/** Centered card layout for sign-in and sign-up. */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-spa-50 to-spa-100 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-spa-accent" />
        <span className="text-2xl font-bold text-spa-primary">Spa.Inc</span>
      </Link>
      <div className={`w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8 ${wide ? "max-w-xl" : "max-w-md"}`}>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
