import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Schema/migration operations use the direct (unpooled) connection —
    // required for advisory locks when the runtime URL goes through a pooler (e.g. Neon/PgBouncer).
    url: env("DIRECT_URL"),
  },
});
