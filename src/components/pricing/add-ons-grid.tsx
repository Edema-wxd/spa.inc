import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addOns, formatNaira } from "@/lib/pricing"

export function AddOnsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {addOns.map((addOn) => (
        <Card key={addOn.id} className="gap-3">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{addOn.name}</CardTitle>
              <Badge variant="outline" className="text-muted-foreground">
                Coming soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{addOn.description}</p>
            {addOn.monthlyPrice === null ? (
              <p className="text-sm font-semibold">
                <Link
                  href={`/contact-sales?addon=${addOn.id}`}
                  className="text-spa-accent hover:underline"
                >
                  Contact sales
                </Link>
                {addOn.enterpriseOnly && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    Enterprise only
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm">
                <span className="font-semibold tabular-nums">
                  {formatNaira(addOn.monthlyPrice)}
                </span>
                <span className="text-muted-foreground">/mo</span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
