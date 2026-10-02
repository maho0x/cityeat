import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/qmai-221033-328009.json";
import { parseQmaiMenu, qmaiMenuRequest } from "./qmai";

describe("qmaiMenuRequest", () => {
  it("asks for the multi-store under the merchant account", () => {
    const { url, init } = qmaiMenuRequest("221033:328009", "tok");
    expect(url).toBe(
      "https://webapiga.qmai.cn/web/catering/goods/list/category-item",
    );
    expect(init.headers).toMatchObject({
      "store-id": "221033",
      "multi-store-id": "328009",
      "Qm-User-Token": "tok",
    });
    expect(JSON.parse(init.body)).toMatchObject({ storeId: "328009" });
  });

  it("uses the merchant id alone when there is no multi-store", () => {
    const { init } = qmaiMenuRequest("221033", "tok");
    expect(init.headers).not.toHaveProperty("multi-store-id");
    expect(JSON.parse(init.body)).toMatchObject({ storeId: "221033" });
  });
});

describe("parseQmaiMenu", () => {
  const menu = parseQmaiMenu(fixture);
  const categories = [...new Set(menu.items.map((i) => i.categoryZh))];

  it("drops the prefix every category shares", () => {
    expect(categories).toEqual([
      "【新品推薦】",
      "多士",
      "特色撈麵-早",
      "焗飯粉類",
      "咖啡飲品",
    ]);
  });

  it("skips the cutlery category", () => {
    expect(menu.items.some((i) => i.nameZh === "紙杯")).toBe(false);
    expect(menu.items).toHaveLength(12);
  });

  it("normalises an item", () => {
    expect(menu.items[0]).toEqual({
      externalId: "1238454817879957505:1299683232866258945",
      categoryZh: "【新品推薦】",
      categoryEn: "【新品推薦】",
      nameZh: "（新品）【A區】古早菠蘿冰（凍飲）",
      nameEn: "（新品）【A區】古早菠蘿冰（凍飲）",
      price: 1500,
      imageUrl: expect.stringMatching(/^https:\/\//),
      available: true,
      sort: 0,
    });
  });

  it("marks out-of-stock and out-of-hours items unavailable", () => {
    expect(menu.items.filter((i) => !i.available).map((i) => i.nameZh)).toEqual(
      [
        "（新品）【A區】炸薯條",
        "（新品）【A區】魷魚圈",
        "（新品）【A區】煉奶鮮油多士-套餐",
        "（新品）【A區】黑松露炒蛋多士-套餐",
        "【A區】咖喱魚蛋蔥油撈麵-套餐",
        "【A區】瑞士雞翅撈麵-套餐",
        "【A區】蔥油撈麵-套餐",
      ],
    );
  });

  it("collapses stray whitespace in names", () => {
    expect(categories).toContain("焗飯粉類");
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
