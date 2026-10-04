"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlan } from "@/components/plan/plan-provider"
import { navSections } from "./nav-items"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { hasFeature } = usePlan()

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Sparkles className="size-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-primary-foreground">
              Spa.Inc
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Management
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-6 px-3">
          {navSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const locked = !!item.feature && !hasFeature(item.feature)
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href))

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                          : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-5 shrink-0",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && locked && (
                        <Lock
                          className="ml-auto size-3.5 text-sidebar-foreground/50"
                          aria-label="Upgrade required"
                        />
                      )}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                          {item.label}
                          {locked && " (upgrade required)"}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <div key={item.href}>
                      {linkContent}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border p-4",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar size="default">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  RT
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <div>
                <p className="font-medium">Rebecca Torres</p>
                <p className="text-xs opacity-70">Admin</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
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
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={onToggleCollapse}
          className={cn(
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "mx-auto" : "w-full justify-start gap-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
