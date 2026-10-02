import { describe, expect, it } from "vitest";
import { isPackaging } from "./filters";

describe("isPackaging", () => {
  it.each([
    ["環保餐盒(只供外賣使用)", 100],
    ["環保餐盒 ‧ 紙杯 ‧ 餐具 (只供外賣使用)", 200],
    ["紙杯(只供外賣使用)", 100],
    ["膠袋", 100],
    ["Takeaway container", 100],
  ])("drops %s", (name, price) => {
    expect(isPackaging(name, price)).toBe(true);
  });

  it.each([
    ["紙杯蛋糕", 1800],
    ["黑糖波霸", 200],
    ["【A區】日式咖哩吉列蝦飯-套餐", 4300],
  ])("keeps %s", (name, price) => {
    expect(isPackaging(name, price)).toBe(false);
  });
});
