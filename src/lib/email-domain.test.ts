import { describe, expect, it } from "vitest";
import { isCityUEmail } from "./email-domain";

describe("isCityUEmail", () => {
  it.each([
    ["chan.taiman@my.cityu.edu.hk", true],
    ["Prof.Wong@CityU.edu.hk", true],
    ["  someone@cityu.edu.hk ", true],
    ["someone@gmail.com", false],
    ["someone@fakecityu.edu.hk", false],
    ["someone@cityu.edu.hk.evil.com", false],
    ["a@b@cityu.edu.hk", false],
    ["@cityu.edu.hk", false],
  ])("%s → %s", (email, ok) => {
    expect(isCityUEmail(email)).toBe(ok);
  });
});
