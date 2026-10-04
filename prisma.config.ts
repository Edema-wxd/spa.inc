import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct (non-pooled) connection, used by the CLI for migrations.
    // Optional so `prisma generate` works without a database (CI, demo builds).
    url: process.env.DIRECT_URL ?? "",
  },
})
