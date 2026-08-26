import { execSync } from "node:child_process";

/**
 * The sharing/authorization test suite is an integration test — it talks to
 * a real Postgres database via Prisma, the same way `npm run dev` does.
 * This just makes sure the schema is in sync with whatever DATABASE_URL/
 * DIRECT_URL are configured (see README) before the suite runs; it does not
 * provision the database itself.
 */
export async function setup() {
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
}
