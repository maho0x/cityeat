import "dotenv/config";
import { rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

/** Remove everything the E2E run created, including uploaded files. */
export default async function teardown() {
  const sql = postgres(process.env.DATABASE_URL ?? "");
  const users = sql`select id from "user" where email like 'e2e.%'`;
  const uploads = await sql<
    { id: string }[]
  >`select id from upload where user_id in (${users})`;
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
  for (const { id } of uploads) {
    await rm(path.join(dir, `${id}.webp`), { force: true });
    await rm(path.join(dir, `${id}_t.webp`), { force: true });
  }
  // menus and submissions outlive their authors by design, so remove them first
  await sql`delete from menu where user_id in (${users})`;
  await sql`delete from submission where user_id in (${users})`;
  await sql`delete from hours_override where note like 'E2E%'`;
  await sql`delete from "user" where email like 'e2e.%'`;
  await sql.end();
}
