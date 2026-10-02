import { describe, expect, it } from "vitest";
import { randomNickname } from "./nickname";

describe("randomNickname", () => {
  it("is an adjective, a food and a four-digit number", () => {
    for (let i = 0; i < 200; i++) {
      expect(randomNickname()).toMatch(/^\p{Script=Han}{4,6} \d{4}$/u);
    }
  });

  it("varies between calls", () => {
    const names = new Set(Array.from({ length: 50 }, randomNickname));
    expect(names.size).toBeGreaterThan(40);
  });
});
