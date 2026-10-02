import { describe, expect, it } from "vitest";
import { menuPriceRange } from "./price";

const dollars = (...xs: number[]) => xs.map((x) => x * 100);

describe("menuPriceRange", () => {
  it("spans the 10th–90th percentile of meals, rounded to $5", () => {
    expect(
      menuPriceRange(dollars(28, 32, 35, 38, 40, 42, 45, 48, 50, 53)),
    ).toEqual([30, 50]);
  });

  it("ignores drinks, toppings and add-ons under $20", () => {
    expect(
      menuPriceRange(dollars(2, 4, 6, 9, 15, 19, 36, 38, 38, 42, 42)),
    ).toEqual([35, 40]);
  });

  it("needs a handful of meals to say anything", () => {
    expect(menuPriceRange(dollars(6, 15, 19, 38, 42, 42, 45))).toBeNull();
    expect(menuPriceRange([])).toBeNull();
  });

  it("keeps a single price when every meal costs the same", () => {
    expect(menuPriceRange(dollars(38, 38, 38, 38, 38))).toEqual([40, 40]);
  });
});
