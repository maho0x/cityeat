export type MenuPlatform = "aigens" | "qmai";
export type OrderStore = { platform: MenuPlatform; storeId: string };

const STORE_ID = /^\d{3,12}$/;

/**
 * Identify the ordering platform and store from a link or QR-code URL.
 * Aigens: `order.place/(home/)store/{id}` or `scan.aigens.com/scan?code=<base64
 * "store={id}&…">`. Qmai: `qmai.cn/…#pages/…?store_id={id}`.
 */
export function parseOrderUrl(raw: string): OrderStore | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname;
  let storeId: string | null | undefined = null;
  let platform: MenuPlatform;

  if (host === "order.place" || host.endsWith(".order.place")) {
    platform = "aigens";
    storeId = url.pathname.match(/\/store\/(\d+)/)?.[1];
  } else if (host === "scan.aigens.com") {
    platform = "aigens";
    const code = url.searchParams.get("code");
    if (!code) return null;
    const decoded = Buffer.from(code, "base64").toString("utf8");
    storeId = new URLSearchParams(decoded).get("store");
  } else if (host.endsWith(".qmai.cn")) {
    platform = "qmai";
    const query = url.hash.split("?")[1] ?? "";
    storeId =
      new URLSearchParams(query).get("store_id") ??
      url.searchParams.get("store_id");
  } else {
    return null;
  }
  return storeId && STORE_ID.test(storeId) ? { platform, storeId } : null;
}
