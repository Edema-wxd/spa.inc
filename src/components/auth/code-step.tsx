"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api-client"

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") })

/** Second step of sign-in and sign-up: the 6-digit code from the email. */
export function CodeStep({
  email,
  demoCode,
  next,
  onBack,
  onResend,
}: {
  email: string
  /** Demo mode only: no email is sent, so the code is shown here */
  demoCode: string | null
  next?: string
  onBack: () => void
  onResend: () => Promise<void>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const form = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } })

  async function onSubmit({ code }: z.infer<typeof codeSchema>) {
    setError(null)
    try {
      const { data } = await apiFetch<{ redirect: string }>("/api/auth/verify", { method: "POST", body: { email, code, next } })
      router.push(data.redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work")
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
      </p>
      {demoCode && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Demo sign-in: no email is sent. Your code is <span className="font-mono font-semibold tracking-wider">{demoCode}</span>
          </p>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center font-mono text-lg tracking-[0.4em]"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </form>
      </Form>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          Use a different email
        </button>
        <button
          type="button"
          disabled={resending}
          onClick={async () => {
            setResending(true)
            await onResend().finally(() => setResending(false))
          }}
          className="text-spa-accent hover:underline disabled:opacity-50"
        >
          Send a new code
        </button>
      </div>
    </div>
  )
}
