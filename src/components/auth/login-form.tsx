"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CodeStep } from "@/components/auth/code-step"
import { apiFetch } from "@/lib/api-client"
import { loginSchema } from "@/lib/validation/accounts"
import type { z } from "zod"

type Values = z.input<typeof loginSchema>

export function LoginForm({ next, demoAvailable }: { next?: string; demoAvailable: boolean }) {
  const [sent, setSent] = useState<{ email: string; demoCode: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "" } })

  async function send(email: string) {
    setError(null)
    try {
      const { data } = await apiFetch<{ email: string; demoCode: string | null }>("/api/auth/login", { method: "POST", body: { email } })
      setSent({ email: data.email, demoCode: data.demoCode })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code")
    }
  }

  if (sent) {
    return (
      <CodeStep
        email={sent.email}
        demoCode={sent.demoCode}
        next={next}
        onBack={() => setSent(null)}
        onResend={async () => {
          await send(sent.email)
          toast.success("New code sent")
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => send(v.email))} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" autoComplete="email" placeholder="you@yourspa.com" className="pl-9" autoFocus {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}{" "}
              {error.includes("free trial") && (
                <Link href="/signup" className="font-medium underline">
                  Start a trial
                </Link>
              )}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Email me a sign-in code
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        New to Spa.Inc?{" "}
        <Link href="/signup" className="font-medium text-spa-accent hover:underline">
          Start a free trial
        </Link>
        {demoAvailable && (
          <>
            {" "}or{" "}
            <a href="/demo" className="font-medium text-spa-accent hover:underline">
              explore the demo
            </a>
          </>
        )}
      </p>
    </div>
  )
}
