import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

// One client per server process (reused across dev hot reloads).
const globalForPrisma = globalThis as unknown as { __spaPrisma?: InstanceType<typeof PrismaClient> }

export function getPrisma() {
  if (!globalForPrisma.__spaPrisma) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.")
    }
    globalForPrisma.__spaPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  }
  return globalForPrisma.__spaPrisma
}
