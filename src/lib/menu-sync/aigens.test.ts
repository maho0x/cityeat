import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/aigens-312882.json";
import { parseAigensMenu } from "./aigens";

const clone = () => structuredClone(fixture) as typeof fixture;

describe("parseAigensMenu", () => {
  const menu = parseAigensMenu(fixture);

  it("reads the store name", () => {
    expect(menu.storeName).toEqual({
      zh: "AC2 Canteen (西北麵館)",
      en: "AC2 Canteen (Xibei Mian Guan)",
    });
  });

  it("keeps only each category's main group, not add-on steps", () => {
    expect(menu.items.map((i) => i.categoryZh)).toEqual([
      ...Array(4).fill("人氣甜點"),
      ...Array(4).fill("刀削麵"),
      ...Array(4).fill("飲品"),
    ]);
    expect(menu.items.some((i) => i.nameZh.startsWith("+"))).toBe(false);
  });

  it("normalises an item", () => {
    expect(menu.items[0]).toEqual({
      externalId: "112882-0709-1100045666",
      categoryZh: "人氣甜點",
      categoryEn: "Dessert",
      nameZh: "蓮子紅豆沙(熱)",
      nameEn: "Red Bean Sweet Soup with Lotus Seeds(Hot)",
      price: 1500,
      imageUrl: null,
      available: true,
      sort: 0,
    });
  });

  it("converts fractional dollars to cents", () => {
    expect(menu.items.find((i) => i.nameZh === "馬豆糕")?.price).toBe(1350);
  });

  it("marks zero inventory as sold out", () => {
    expect(menu.items.filter((i) => !i.available).map((i) => i.nameZh)).toEqual(
      ["馬豆糕", "麻酸辣魚肉春卷撈刀削麵"],
    );
  });

  it("uses the default image's CDN url", () => {
    const withImage = menu.items.find((i) => i.imageUrl);
    expect(withImage?.imageUrl).toBe(
      "https://content.aigens.com/image/tmOdfD4lFB9MZ7HCKaDriAfR89HOlswAmxLbJaqHjYo=w400.jpg",
    );
  });

  it("skips unpublished categories and items", () => {
    const raw = clone();
    raw.data.menu.categories[0].published = false;
    const beverage = raw.data.menu.groups.find((g) => g.name === "Beverage");
    if (beverage) beverage.items[0].published = false;
    const names = parseAigensMenu(raw).items.map((i) => i.nameZh);
    expect(names).not.toContain("蓮子紅豆沙(熱)");
    expect(names).not.toContain("紅芭樂梳打");
    expect(names).toHaveLength(7);
  });

  it("falls back to the other language when a name is blank", () => {
    const raw = clone();
    raw.data.menu.groups[0].items[0].name = "  ";
    expect(parseAigensMenu(raw).items[0].nameEn).toBe("蓮子紅豆沙(熱)");
  });

  it("rejects a response that is not a menu", () => {
    expect(() => parseAigensMenu({ status: 0, data: null })).toThrow();
  });
});
