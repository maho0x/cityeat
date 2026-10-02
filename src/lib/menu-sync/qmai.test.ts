import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/qmai-221033.json";
import { parseQmaiMenu } from "./qmai";

describe("parseQmaiMenu", () => {
  const menu = parseQmaiMenu(fixture);

  it("skips notice entries (type 10)", () => {
    expect(menu.items.some((i) => i.categoryZh === "温馨公告")).toBe(false);
    expect(menu.items).toHaveLength(11);
  });

  it("normalises an item", () => {
    expect(menu.items[0]).toEqual({
      externalId: "1307388418155802624:1307398332170440705",
      categoryZh: "新脏脏茶",
      categoryEn: "新脏脏茶",
      nameZh: "「脏脏茶虎虎喝」双杯套餐",
      nameEn: "「脏脏茶虎虎喝」双杯套餐",
      price: 5000,
      imageUrl: expect.stringMatching(/^https:\/\/images\.qmai\.cn\//),
      available: true,
      sort: 0,
    });
  });

  it("converts fractional dollars to cents", () => {
    expect(menu.items[4].price).toBe(2350);
  });

  it("marks out-of-stock items unavailable", () => {
    expect(menu.items.filter((i) => i.available)).toHaveLength(1);
  });

  it("keeps a dish listed in two categories in both", () => {
    const peach = menu.items.filter((i) => i.nameZh.startsWith("草莓桃子"));
    expect(peach.map((i) => i.categoryZh)).toEqual(["乐乐招牌", "冰爽鲜果茶"]);
    expect(new Set(peach.map((i) => i.externalId)).size).toBe(2);
  });

  it("reports an expired login", () => {
    expect(() =>
      parseQmaiMenu({
        code: 9001,
        data: null,
        message: "登录超时",
        status: false,
      }),
    ).toThrow(/QMAI_USER_TOKEN/);
  });
});
