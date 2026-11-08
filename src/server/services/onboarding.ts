import "server-only"

import { STARTER_DEFAULTS, STARTER_MENU } from "@/lib/starter-menu"
import type { TeamMemberInput } from "@/lib/validation/onboarding"
import { getAppUrl, bookingPagePath } from "@/server/app-url"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { ApiError, NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

// ---------------------------------------------------------------------------
// First-run checklist: from sign-up to a first booking in a few minutes.
// Progress is derived from real data where possible (services exist,
// someone bookable has hours, a booking exists); only "shared the link" and
// "dismissed" are stored.
// ---------------------------------------------------------------------------

export async function getOnboarding(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  const repos = await getRepositories()
  const [org, services, users, appointments, owner] = await Promise.all([
    repos.organizations.get(ctx.organizationId),
    repos.services.list(ctx.organizationId),
    repos.users.list(ctx.organizationId, { activeOnly: true }),
    repos.appointments.list(ctx.organizationId),
    repos.users.get(ctx.organizationId, ctx.userId),
  ])
  if (!org) throw new NotFoundError("Organization")

  const bookable = users.filter((u) => u.is_bookable)
  const schedules = (await Promise.all(bookable.map((u) => repos.schedules.listForStaff(ctx.organizationId, u.id)))).flat()
  const withHours = bookable.filter((u) => schedules.some((s) => s.staff_id === u.id && s.is_available))

  const steps = {
    services: services.some((s) => s.is_active),
    team: withHours.length > 0,
    link: !!org.onboarding.link_shared_at,
    booking: appointments.length > 0,
  }
  const done = Object.values(steps).filter(Boolean).length
  return {
    business: { name: org.name, slug: org.slug, currency: org.currency },
    ownerFirstName: owner?.full_name.split(" ")[0] ?? "",
    ownerIsBookable: !!owner?.is_bookable,
    steps,
    done,
    total: Object.keys(steps).length,
    complete: done === Object.keys(steps).length,
    dismissed: !!org.onboarding.dismissed_at,
    bookingUrl: `${await getAppUrl()}${bookingPagePath(org.slug)}`,
    services: services.map((s) => ({ id: s.id, name: s.name, duration: s.default_duration_minutes, price: s.default_price })),
    team: withHours.map((u) => ({
      id: u.id,
      name: u.full_name,
      isOwner: u.id === ctx.userId,
      days: schedules.filter((s) => s.staff_id === u.id && s.is_available).map((s) => s.day_of_week).sort(),
    })),
    starterMenu: STARTER_MENU.map((item) => ({
      key: item.key,
      name: item.name,
      description: item.description,
      duration: item.duration,
      price: item.price[org.currency],
      selected: STARTER_DEFAULTS.includes(item.key),
    })),
  }
}

export type OnboardingState = Awaited<ReturnType<typeof getOnboarding>>

/** Adds the owner (as a therapist) or a team member, with their weekly hours. */
export async function addTeamMember(ctx: RequestContext, input: TeamMemberInput) {
  assertRole(ctx, "ADMIN")
  const repos = await getRepositories()
  const schedule = input.days.map((day) => ({
    day_of_week: day,
    start_time: input.start_time,
    end_time: input.end_time,
    is_available: true,
  }))

  if (input.self) {
    // Solo owners and owner-therapists take bookings themselves (every plan)
    const owner = await repos.users.update(ctx.organizationId, ctx.userId, { is_bookable: true })
    if (!owner) throw new NotFoundError("User")
    await repos.schedules.replaceForStaff(ctx.organizationId, owner.id, schedule)
    return owner
  }

  assertFeature(ctx, "staffManagement")
  if (await repos.users.findByEmail(input.email!)) {
    throw new ApiError(409, "VALIDATION_ERROR", "Someone already uses this email", { email: ["Someone already uses this email"] })
  }
  const member = await repos.users.create(ctx.organizationId, {
    full_name: input.full_name!,
    email: input.email!.trim().toLowerCase(),
    phone: input.phone,
    role: "STAFF",
    is_bookable: true,
  })
  await repos.schedules.replaceForStaff(ctx.organizationId, member.id, schedule)
  return member
}

export async function recordOnboardingProgress(ctx: RequestContext, action: "link_shared" | "dismiss") {
  assertRole(ctx, "ADMIN")
  const { organizations } = await getRepositories()
  const now = new Date().toISOString()
  await organizations.updateOnboarding(ctx.organizationId, action === "link_shared" ? { link_shared_at: now } : { dismissed_at: now })
}
