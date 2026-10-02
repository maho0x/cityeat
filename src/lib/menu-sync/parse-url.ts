export type MenuPlatform = "aigens" | "qmai";
export type OrderStore = { platform: MenuPlatform; storeId: string };

const STORE_ID = /^\d{3,12}(:\d{3,12})?$/;

/**
 * Identify the ordering platform and store from a link or QR-code URL.
 * Aigens: `order.place/(home/)store/{id}` or `scan.aigens.com/scan?code=<base64
 * "store={id}&…">`. Qmai: `qmai.cn/…#pages/…?store_id={seller}&multi_id={shop}`,
 * stored as `{seller}:{shop}`.
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
    const hash = new URLSearchParams(url.hash.split("?")[1] ?? "");
    const param = (k: string) => hash.get(k) ?? url.searchParams.get(k);
    // store_id is the merchant account; multi_id picks one of its shops.
    const seller = param("store_id");
    const shop = param("multi_id");
    storeId = seller && shop ? `${seller}:${shop}` : seller;
  } else {
    return null;
  }
  return storeId && STORE_ID.test(storeId) ? { platform, storeId } : null;
}
