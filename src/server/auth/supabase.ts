import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase client bound to this request's cookies. Supabase keeps the session
 * in `sb-<project>-auth-token` cookies; the proxy refreshes them.
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function getSupabase() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options)
        } catch {
          // Called from a Server Component, where cookies are read-only; the proxy refreshes them
        }
      },
    },
  })
}
