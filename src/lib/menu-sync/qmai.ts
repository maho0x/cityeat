import { z } from "zod";
import type { MenuItemInput, ParsedMenu } from "./types";

/**
 * Qmai (企迈) only serves menus to a signed-in user. The token is the
 * `qm-user-token` request header of pth5.qmai.cn after logging in. HK shops
 * live on the `webapiga` cluster; `storeId` is `{seller}` or `{seller}:{shop}`
 * (see parseOrderUrl).
 */
export function qmaiMenuRequest(storeId: string, token: string) {
  const [seller, shop] = storeId.split(":");
  return {
    url: "https://webapiga.qmai.cn/web/catering/goods/list/category-item",
    init: {
      method: "POST",
      headers: {
        Accept: "v=1.0",
        "Accept-Language": "zh-HK",
        "Content-Type": "application/json",
        Referer: "https://pth5.qmai.cn/",
        "Qm-From": "h5",
        "Qm-From-Type": "catering",
        "Qm-User-Token": token,
        "store-id": seller,
        ...(shop && { "multi-store-id": shop }),
      },
      body: JSON.stringify({
        orderType: 1,
        storeId: shop ?? seller,
        buyTime: "",
        version: 3,
        appid: "",
      }),
    },
  };
}

/** Item `type` 10 is a notice card (e.g. 温馨公告), not something to order. */
const NOTICE = 10;
const LOGIN_ERRORS = new Set(["9001", "10008"]);

const response = z.object({
  status: z.boolean(),
  code: z.union([z.string(), z.number()]).nullish(),
  message: z.string().nullish(),
  data: z
    .object({
      categoryItems: z.array(
        z.object({
          categoryId: z.string(),
          categoryName: z.string(),
          itemList: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              coverUrl: z.string().nullish(),
              showPriceLow: z.number().nullish(),
              stockStatus: z.number().nullish(),
              isSaleTime: z.number().nullish(),
              type: z.number().nullish(),
            }),
          ),
        }),
      ),
    })
    .nullish(),
});

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Cutlery and cup choices are listed as a category but aren't food. */
const isCutlery = (category: string) => category.includes("餐具");

/** Shops prefix every category with a code, e.g. "AC3-多士". */
function sharedPrefix(names: string[]) {
  const prefix = names[0]?.match(/^[A-Za-z0-9]+-/)?.[0];
  return prefix && names.length > 1 && names.every((n) => n.startsWith(prefix))
    ? prefix
    : "";
}

/**
 * Menus have Chinese names only, so both languages get the same text. A dish
 * can sit in several categories; each copy is kept.
 */
export function parseQmaiMenu(raw: unknown): ParsedMenu {
  const res = response.parse(raw);
  if (!res.status || !res.data) {
    const code = String(res.code ?? "");
    const detail = `Qmai ${code} ${res.message ?? ""}`.trim();
    throw new Error(
      LOGIN_ERRORS.has(code)
        ? `${detail}: login expired, update QMAI_USER_TOKEN`
        : detail,
    );
  }
  const cats = res.data.categoryItems.map((c) => ({
    ...c,
    categoryName: clean(c.categoryName),
  }));
  const prefix = sharedPrefix(cats.map((c) => c.categoryName));
  const items: MenuItemInput[] = [];
  for (const cat of cats) {
    if (isCutlery(cat.categoryName)) continue;
    const category = cat.categoryName.slice(prefix.length);
    for (const it of cat.itemList) {
      const name = clean(it.name);
      if (it.type === NOTICE || it.showPriceLow == null || !name) continue;
      items.push({
        externalId: `${cat.categoryId}:${it.id}`,
        categoryZh: category,
        categoryEn: category,
        nameZh: name,
        nameEn: name,
        price: Math.round(it.showPriceLow * 100),
        imageUrl: it.coverUrl || null,
        available: it.stockStatus === 1 && it.isSaleTime !== 0,
        sort: items.length,
      });
    }
  }
  return { storeName: { zh: "", en: "" }, items };
}
