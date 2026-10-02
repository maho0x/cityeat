import "dotenv/config";
import { dueSources, syncSource } from "@/lib/menu-sync/sync";

/**
 * Keeps ordering-platform menus fresh: every minute, sync each enabled
 * source not attempted within MENU_SYNC_INTERVAL_MINUTES (default 60).
 * `--once` syncs every enabled source once and exits.
 */
const once = process.argv.includes("--once");
const intervalMs =
  Number(process.env.MENU_SYNC_INTERVAL_MINUTES || 60) * 60_000;

async function round(interval: number) {
  for (const source of await dueSources(interval)) {
    const result = await syncSource(source);
    const label = `${source.platform}:${source.storeId}`;
    if (result.ok) console.info(`[menu-sync] ${label} ${result.items} items`);
    else console.warn(`[menu-sync] ${label} failed: ${result.error}`);
  }
}

async function main() {
  if (once) {
    await round(0);
    process.exit(0);
  }
  console.info(`[menu-sync] every ${intervalMs / 60_000} min`);
  for (;;) {
    await round(intervalMs).catch((e) => console.error("[menu-sync]", e));
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

process.on("SIGTERM", () => process.exit(0));
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
