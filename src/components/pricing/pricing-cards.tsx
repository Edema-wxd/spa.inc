"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  ANNUAL_DISCOUNT,
  FREE_TRIAL_DAYS,
  formatPrice,
  getAnnualTotal,
  getMonthlyEquivalent,
  pricingTiers,
  type BillingCycle,
  type Currency,
} from "@/lib/pricing"
import { cn } from "@/lib/utils"

export function PricingCards({ currency }: { currency: Currency }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly")
  const isAnnual = cycle === "annual"

  return (
    <div className="space-y-10">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="billing-cycle"
          className={cn(!isAnnual ? "text-foreground" : "text-muted-foreground")}
        >
          Monthly
        </Label>
        <Switch
          id="billing-cycle"
          checked={isAnnual}
          onCheckedChange={(checked) => setCycle(checked ? "annual" : "monthly")}
          aria-label="Toggle annual billing"
        />
        <Label
          htmlFor="billing-cycle"
          className={cn(isAnnual ? "text-foreground" : "text-muted-foreground")}
        >
          Annual
        </Label>
        <Badge className="bg-emerald-100 text-emerald-700">
          Save {Math.round(ANNUAL_DISCOUNT * 100)}%
        </Badge>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.id}
            className={cn(
              "relative flex flex-col",
              tier.mostPopular && "border-spa-accent shadow-lg ring-2 ring-spa-accent"
            )}
          >
            {tier.mostPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-spa-accent text-white">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-spa-accent">
                {tier.audience}
              </p>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-6">
              <div className="min-h-20">
                {tier.prices === null ? (
                  <>
                    <p className="text-3xl font-bold tracking-tight">Custom quote</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Priced per location and onboarding scope
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight tabular-nums">
                        {formatPrice(getMonthlyEquivalent(tier.prices[currency], cycle), currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isAnnual ? (
                        <>
                          {formatPrice(getAnnualTotal(tier.prices[currency]), currency)} billed yearly
                          <span className="ml-1 line-through">
                            {formatPrice(tier.prices[currency] * 12, currency)}
                          </span>
                        </>
                      ) : (
                        "Billed monthly"
                      )}
                    </p>
                  </>
                )}
              </div>

              <ul className="space-y-2.5 text-sm">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full"
                variant={tier.mostPopular ? "default" : "outline"}
              >
                <Link href={tier.cta.href}>{tier.cta.label}</Link>
              </Button>
              {tier.freeTrial && (
                <p className="text-center text-xs text-muted-foreground">
                  Try every Essentials feature free for {FREE_TRIAL_DAYS} days
                </p>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
