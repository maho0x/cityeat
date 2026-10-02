import { z } from "zod";
import type { MenuItemInput, ParsedMenu } from "./types";

/** Public menu JSON; the order.place web app loads the same URL. */
export const aigensMenuUrl = (storeId: string) =>
  `https://api.aigens.com/api/v1/menu/store/${storeId}.json?locale=multi&channel=mobile`;

const text = z.string().nullish();
const flags = {
  published: z.boolean().nullish(),
  suspended: z.boolean().nullish(),
  archived: z.boolean().nullish(),
};
const image = z.object({ url: text, source: text }).partial().nullish();

const item = z.object({
  id: z.string(),
  name: text,
  name_zh: text,
  price: z.number().nullish(),
  images: z.object({ default: image }).partial().nullish(),
  inventory: z.number().nullish(),
  ...flags,
});

const response = z.object({
  data: z.object({
    name: text,
    name_zh: text,
    menu: z.object({
      categories: z.array(
        z.object({
          name: text,
          name_zh: text,
          groupIds: z.array(z.string()).nullish(),
          ...flags,
        }),
      ),
      groups: z.array(z.object({ id: z.string(), items: z.array(item) })),
    }),
  }),
});

const clean = (s: string | null | undefined) =>
  (s ?? "").replace(/\s+/g, " ").trim();

/** Both languages, each falling back to the other when blank. */
function names(en: string | null | undefined, zh: string | null | undefined) {
  const e = clean(en);
  const c = clean(zh);
  return { zh: c || e, en: e || c };
}

type Flags = { published?: boolean | null; archived?: boolean | null };
const visible = (x: Flags) => x.published !== false && !x.archived;

/**
 * A category's first group holds its dishes; later groups are ordering steps
 * (add-ons, set drinks, takeaway boxes) and are skipped.
 */
export function parseAigensMenu(raw: unknown): ParsedMenu {
  const { data } = response.parse(raw);
  const groups = new Map(data.menu.groups.map((g) => [g.id, g]));
  const seen = new Set<string>();
  const items: MenuItemInput[] = [];

  for (const cat of data.menu.categories) {
    if (!visible(cat) || cat.suspended) continue;
    const main = groups.get(cat.groupIds?.[0] ?? "");
    if (!main) continue;
    const category = names(cat.name, cat.name_zh);
    for (const it of main.items) {
      if (!visible(it) || it.price == null || seen.has(it.id)) continue;
      seen.add(it.id);
      const name = names(it.name, it.name_zh);
      if (!name.zh) continue;
      const img = it.images?.default;
      items.push({
        externalId: it.id,
        categoryZh: category.zh,
        categoryEn: category.en,
        nameZh: name.zh,
        nameEn: name.en,
        price: Math.round(it.price * 100),
        imageUrl: img?.url || img?.source || null,
        available: !it.suspended && it.inventory !== 0,
        sort: items.length,
      });
    }
  }
  return { storeName: names(data.name, data.name_zh), items };
}
