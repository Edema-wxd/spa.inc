"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlan } from "@/components/plan/plan-provider"
import { navSections } from "./nav-items"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { hasFeature } = usePlan()

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="left"
        showCloseButton={true}
        className="flex w-[280px] flex-col bg-sidebar p-0 text-sidebar-foreground sm:max-w-[280px]"
      >
        {/* Logo */}
        <SheetHeader className="border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <Sparkles className="size-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-primary-foreground">
                Spa.Inc
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Management
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-6 px-3">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </p>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const locked = !!item.feature && !hasFeature(item.feature)
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href))

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                            : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-5 shrink-0",
                            isActive
                              ? "text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/60"
                          )}
                        />
                        <span>{item.label}</span>
                        {locked && (
                          <Lock
                            className="ml-auto size-3.5 text-sidebar-foreground/50"
                            aria-label="Upgrade required"
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User Profile */}
        <div className="shrink-0 border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                RT
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-primary-foreground">
                Rebecca Torres
              </span>
              <Badge
                variant="secondary"
                className="mt-0.5 w-fit bg-sidebar-accent text-[10px] text-sidebar-accent-foreground"
              >
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
