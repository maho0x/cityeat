import { z } from "zod";
import type { MenuItemInput, ParsedMenu } from "./types";

/**
 * Qmai (企迈) only serves menus to a signed-in user. The token is the
 * `Qm-User-Token` request header of pth5.qmai.cn after logging in.
 */
export function qmaiMenuRequest(storeId: string, token: string) {
  return {
    url: "https://webapi.qmai.cn/web/catering/goods/list/category-item",
    init: {
      method: "POST",
      headers: {
        Accept: "v=1.0",
        "Content-Type": "application/json",
        "Qm-From": "wechat",
        "Qm-User-Token": token,
        "store-id": storeId,
      },
      body: JSON.stringify({ orderType: 2, storeId, buyTime: "", version: 3 }),
    } satisfies RequestInit,
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

/**
 * Menus are Simplified Chinese only, so both languages get the same text.
 * A dish can sit in several categories; each copy is kept.
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
  const items: MenuItemInput[] = [];
  for (const cat of res.data.categoryItems) {
    const category = clean(cat.categoryName);
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
