import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasSessionCookie, supabaseConfigured } from "@/server/auth/config"

/**
 * Runs before dashboard pages and API routes (Next 16 "proxy", formerly middleware).
 * - Dashboard pages without a session cookie go to /login. The cookie is only
 *   a hint here; every request is verified properly in getRequestContext().
 * - Passes the path to layouts as x-pathname (staff page rules).
 * - With Supabase, refreshes the session cookies when the access token expires.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  if (pathname.startsWith("/dashboard") && !hasSessionCookie(request.cookies.getAll().map((c) => c.name))) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } })
  if (supabaseConfigured()) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value)
          response = NextResponse.next({ request: { headers: new Headers(request.headers) } })
          response.headers.set("x-pathname", pathname)
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options)
        },
      },
    })
    await supabase.auth.getUser()
  }
  return response
}

export const config = {
  // Public pages, the booking page and static files skip the proxy
  matcher: ["/dashboard/:path*", "/api/:path*", "/auth/:path*"],
}
