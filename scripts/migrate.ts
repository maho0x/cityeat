import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Apply pending migrations; bundled into the production image. */
async function main() {
  const client = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  console.info("Migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
