import { describe, expect, it } from "vitest";
import {
  type Dish,
  dishMatches,
  matchesRestaurant,
  parseSearch,
} from "./search";

describe("parseSearch", () => {
  it.each([
    ["", { text: "", maxPrice: null }],
    ["  Curry ", { text: "curry", maxPrice: null }],
    ["咖喱 $40", { text: "咖哩", maxPrice: 40 }],
    ["$ 35 咖喱", { text: "咖哩", maxPrice: 35 }],
    ["40以下", { text: "", maxPrice: 40 }],
    ["飯 50蚊以內", { text: "飯", maxPrice: 50 }],
    ["noodles under 30", { text: "noodles", maxPrice: 30 }],
    ["<45", { text: "", maxPrice: 45 }],
  ])("parses %j", (raw, expected) => {
    expect(parseSearch(raw)).toEqual(expected);
  });

  it("doesn't read a building code as a budget", () => {
    expect(parseSearch("AC3")).toEqual({ text: "ac3", maxPrice: null });
  });
});

const dish = (over: Partial<Dish> = {}): Dish => ({
  restaurantId: 1,
  name: "日式咖哩吉列蝦飯",
  altName: "Japanese Curry Shrimp Cutlet Rice",
  price: 4300,
  available: true,
  ...over,
});

describe("dishMatches", () => {
  it("matches either language, ignoring case", () => {
    expect(dishMatches(dish(), parseSearch("咖哩"))).toBe(true);
    expect(dishMatches(dish(), parseSearch("CURRY"))).toBe(true);
    expect(dishMatches(dish(), parseSearch("拉麵"))).toBe(false);
  });

  it("treats the two spellings of curry (咖喱 / 咖哩) as one", () => {
    expect(dishMatches(dish(), parseSearch("咖喱"))).toBe(true);
    expect(dishMatches(dish({ name: "咖喱魚蛋" }), parseSearch("咖哩"))).toBe(
      true,
    );
  });

  it("applies the budget in whole dollars", () => {
    expect(dishMatches(dish(), parseSearch("咖哩 $43"))).toBe(true);
    expect(dishMatches(dish(), parseSearch("咖哩 $42"))).toBe(false);
  });

  it("never matches an empty search", () => {
    expect(dishMatches(dish(), parseSearch(""))).toBe(false);
  });
});

describe("matchesRestaurant", () => {
  const ac3 = { haystack: "ac3 bistro 劉鳴煒學術樓", priceMin: 20 };

  it("matches everything when there is no search", () => {
    expect(matchesRestaurant(ac3, [], parseSearch(""))).toBe(true);
  });

  it("matches on the restaurant's own text", () => {
    expect(matchesRestaurant(ac3, [], parseSearch("bistro"))).toBe(true);
    expect(
      matchesRestaurant({ ...ac3, haystack: "麪檔" }, [], parseSearch("麵")),
    ).toBe(true);
  });

  it("matches when one of its dishes does", () => {
    expect(matchesRestaurant(ac3, [dish()], parseSearch("咖哩"))).toBe(true);
    expect(matchesRestaurant(ac3, [dish()], parseSearch("拉麵"))).toBe(false);
  });

  it("uses dish prices for a budget when it has a menu", () => {
    expect(matchesRestaurant(ac3, [dish()], parseSearch("$40"))).toBe(false);
    expect(
      matchesRestaurant(
        ac3,
        [dish(), dish({ price: 2500 })],
        parseSearch("$40"),
      ),
    ).toBe(true);
  });

  it("falls back to the lowest price per person without a menu", () => {
    expect(matchesRestaurant(ac3, [], parseSearch("$20"))).toBe(true);
    expect(matchesRestaurant(ac3, [], parseSearch("$15"))).toBe(false);
    expect(
      matchesRestaurant({ ...ac3, priceMin: null }, [], parseSearch("$40")),
    ).toBe(false);
  });

  it("needs both name and budget to fit", () => {
    expect(matchesRestaurant(ac3, [dish()], parseSearch("bistro $40"))).toBe(
      false,
    );
  });
});
