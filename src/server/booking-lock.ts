import "server-only"

// Serializes "check the slot is free, then insert" per organization within this
// server process, so two simultaneous bookings can't both pass the clash
// check. Across several instances this is not enough on its own: Postgres
// needs an exclusion constraint on (staff_id, time range) as well (see
// docs/ACTION_PLAN.md, item 1 follow-ups).

const globalForLocks = globalThis as unknown as { __spaBookingLocks?: Map<string, Promise<unknown>> }
const locks = (globalForLocks.__spaBookingLocks ??= new Map())

export async function withBookingLock<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(organizationId) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => (release = resolve))
  const chained = previous.then(() => current)
  locks.set(organizationId, chained)
  await previous
  try {
    return await fn()
  } finally {
    release()
    if (locks.get(organizationId) === chained) locks.delete(organizationId)
  }
}
