import { Fragment } from "react"
import { Check, Minus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { featureGroups, pricingTiers, type FeatureValue } from "@/lib/pricing"
import { cn } from "@/lib/utils"

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Included" />
  }
  if (value === false) {
    return (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />
    )
  }
  return <span className="text-sm font-medium">{value}</span>
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Features</TableHead>
            {pricingTiers.map((tier) => (
              <TableHead
                key={tier.id}
                className={cn(
                  "text-center",
                  tier.mostPopular && "bg-spa-50 text-spa-primary"
                )}
              >
                {tier.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {featureGroups.map((group) => (
            <Fragment key={group.title}>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell
                  colSpan={pricingTiers.length + 1}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {group.title}
                </TableCell>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="whitespace-normal">{row.label}</TableCell>
                  {pricingTiers.map((tier) => (
                    <TableCell
                      key={tier.id}
                      className={cn("text-center", tier.mostPopular && "bg-spa-50/60")}
                    >
                      <FeatureCell value={row.values[tier.id]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
