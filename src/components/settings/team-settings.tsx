"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { UserPlus, Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { LimitBanner } from "@/components/plan/limit-banner"
import { usePlan } from "@/components/plan/plan-provider"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { userInviteSchema, type UserInviteInput } from "@/lib/validation/users"
import { cn, getInitials } from "@/lib/utils"
import type { User } from "@/types"

const roleColorMap: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  STAFF: "bg-blue-100 text-blue-700 hover:bg-blue-100",
}

export function TeamSettings() {
  const [members, setMembers] = useState<User[] | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetch<User[]>("/api/users")
      .then(({ data }) => !cancelled && setMembers(data))
      .catch((err) => {
        if (cancelled) return
        toast.error(err instanceof Error ? err.message : "Could not load team")
        setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <div className="space-y-4">
      <LimitBanner resource="admins" />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage your team and their access levels.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {members === null ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              compact
              icon={<Users className="h-10 w-10" />}
              title="No team members yet"
              description="Invite admins and therapists to collaborate in Spa.Inc."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-spa-light text-spa-accent text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(roleColorMap[user.role] || "bg-gray-100 text-gray-600", "font-medium")}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          user.is_active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-100",
                          "font-medium"
                        )}
                      >
                        {user.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={() => setReloadKey((k) => k + 1)} />
    </div>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
}) {
  const router = useRouter()
  const { canAdd, hasFeature } = usePlan()
  const form = useForm<UserInviteInput>({
    resolver: zodResolver(userInviteSchema),
    defaultValues: { full_name: "", email: "", phone: "", role: "ADMIN" },
  })
  const role = useWatch({ control: form.control, name: "role" })
  const blocked =
    role === "ADMIN"
      ? !canAdd("admins") && "Your plan's admin account limit has been reached."
      : !hasFeature("staffManagement") && "Adding therapists requires the Manager plan or higher."

  async function onSubmit(values: UserInviteInput) {
    try {
      await apiFetch("/api/users", { method: "POST", body: values })
      toast.success(`Invitation sent to ${values.email}`)
      form.reset()
      onOpenChange(false)
      onInvited()
      router.refresh() // refresh plan usage
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not send invitation")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>They will receive an email to join your workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff (therapist)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {blocked && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {blocked} Upgrade in the Plan &amp; Billing tab.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!blocked || form.formState.isSubmitting}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
