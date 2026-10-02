import { describe, expect, it } from "vitest";
import { parseOrderUrl } from "./parse-url";

describe("parseOrderUrl", () => {
  it.each([
    ["https://csd.order.place/home/store/312882?_aigens_source=scan", "312882"],
    ["https://csd.order.place/home/store/612882?_aigens_source=scan", "612882"],
    [
      "https://csd.order.place/store/712882/mode/pickup?_aigens_source=scan&onpremise=true",
      "712882",
    ],
    [
      "https://csd.order.place/store/112870/mode/prekiosk?_aigens_source=scan&onpremise=true",
      "112870",
    ],
    [
      "https://scan.aigens.com/scan?code=c3RvcmU9MjEyODgyJm1vZGU9cGlja3VwJnBhZ2U9YnlvZA==",
      "212882",
    ],
  ])("reads Aigens store from %s", (url, storeId) => {
    expect(parseOrderUrl(url)).toEqual({ platform: "aigens", storeId });
  });

  it("reads the Qmai merchant and multi-store ids from the hash route", () => {
    expect(
      parseOrderUrl(
        "https://pth5.qmai.cn/mp-monorepo-h5/web/index.html#pages/takefood/index?store_id=221033&multi_id=328009",
      ),
    ).toEqual({ platform: "qmai", storeId: "221033:328009" });
  });

  it("reads a Qmai link without a multi-store", () => {
    expect(
      parseOrderUrl(
        "https://pth5.qmai.cn/mp-monorepo-h5/web/index.html#pages/takefood/index?store_id=221033",
      ),
    ).toEqual({ platform: "qmai", storeId: "221033" });
  });

  it.each([
    "not a url",
    "https://example.com/store/123",
    "https://csd.order.place/home",
    "https://scan.aigens.com/scan?code=!!!",
    "https://pth5.qmai.cn/mp-monorepo-h5/web/index.html#pages/home",
  ])("rejects %s", (url) => {
    expect(parseOrderUrl(url)).toBeNull();
  });
});
