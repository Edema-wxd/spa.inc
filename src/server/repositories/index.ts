import "server-only"

import type { Repositories } from "@/server/repositories/types"

export type DataSource = "memory" | "prisma"

/** `DATA_SOURCE=prisma` switches every repository to PostgreSQL. */
export function getDataSource(): DataSource {
  return process.env.DATA_SOURCE === "prisma" ? "prisma" : "memory"
}

let cached: Repositories | undefined

export async function getRepositories(): Promise<Repositories> {
  if (!cached) {
    // Imported lazily so the demo never loads Prisma or needs DATABASE_URL
    cached =
      getDataSource() === "prisma"
        ? (await import("@/server/repositories/prisma")).prismaRepositories
        : (await import("@/server/repositories/memory")).memoryRepositories
  }
  return cached
}
