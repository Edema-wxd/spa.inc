"use client"

import { Check, Copy, MessageCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  return {
    copied,
    copy: async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(key)
        window.setTimeout(() => setCopied(null), 1500)
      } catch {
        setCopied(null)
      }
    },
  }
}

export function ShareCard({ url, businessName, enabled }: { url: string; businessName: string; enabled: boolean }) {
  const { copied, copy } = useCopy()
  const embed = `<a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#1B4F72;color:#fff;font:600 15px system-ui,sans-serif;text-decoration:none">Book now</a>`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Book your next visit at ${businessName}: ${url}`)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your booking link</CardTitle>
        <CardDescription>
          {enabled
            ? "Put it in your Instagram bio, WhatsApp Business profile and Google listing. Clients book themselves 24/7."
            : "Online booking is switched off. Turn it on in the settings below to start taking bookings."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={url} aria-label="Booking link" className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copy("link", url)}>
              {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </Button>
            <Button asChild variant="outline">
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </a>
            </Button>
          </div>
        </div>
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Add a &ldquo;Book now&rdquo; button to your website</summary>
          <p className="mt-2 text-muted-foreground">Paste this HTML wherever the button should appear.</p>
          <Textarea readOnly value={embed} rows={3} className="mt-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => copy("embed", embed)}>
            {copied === "embed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "embed" ? "Copied" : "Copy HTML"}
          </Button>
        </details>
      </CardContent>
    </Card>
  )
}
