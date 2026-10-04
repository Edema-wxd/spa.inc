import "server-only"

import type { ScheduleInput, StaffUpdateInput, UserInviteInput } from "@/lib/validation/users"
import type { RequestContext } from "@/server/context"
import { assertCanAdd, assertFeature, assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

// Team members (Settings > Team). Admin seats are limited per plan.

export async function listTeam(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  const { users } = await getRepositories()
  return users.list(ctx.organizationId)
}

export async function inviteUser(ctx: RequestContext, input: UserInviteInput) {
  assertRole(ctx, "ADMIN")
  const { users } = await getRepositories()
  if (input.role === "ADMIN") {
    assertCanAdd(ctx, "admins", await users.count(ctx.organizationId, { role: "ADMIN", activeOnly: true }))
  } else {
    assertFeature(ctx, "staffManagement")
  }
  // TODO: send the Supabase Auth invite email
  return users.create(ctx.organizationId, input)
}

// Staff (therapists). The staff module requires Manager or higher.

export async function listStaff(ctx: RequestContext) {
  assertFeature(ctx, "staffManagement")
  const { users } = await getRepositories()
  return users.list(ctx.organizationId, { role: "STAFF" })
}

export async function getStaff(ctx: RequestContext, id: string) {
  assertFeature(ctx, "staffManagement")
  const { users } = await getRepositories()
  const staff = await users.get(ctx.organizationId, id)
  if (!staff || staff.role !== "STAFF") throw new NotFoundError("Staff member")
  return staff
}

export async function createStaff(ctx: RequestContext, input: Omit<UserInviteInput, "role">) {
  return inviteUser(ctx, { ...input, role: "STAFF" })
}

export async function updateStaff(ctx: RequestContext, id: string, input: StaffUpdateInput) {
  assertRole(ctx, "ADMIN")
  await getStaff(ctx, id)
  const { users } = await getRepositories()
  return (await users.update(ctx.organizationId, id, input))!
}

export async function getStaffSchedule(ctx: RequestContext, id: string) {
  await getStaff(ctx, id)
  const { schedules } = await getRepositories()
  return schedules.listForStaff(ctx.organizationId, id)
}

export async function updateStaffSchedule(ctx: RequestContext, id: string, input: ScheduleInput) {
  assertRole(ctx, "ADMIN")
  await getStaff(ctx, id)
  const { schedules } = await getRepositories()
  return schedules.replaceForStaff(ctx.organizationId, id, input)
}
