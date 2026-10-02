import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";

const OTP = "246810";

async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("CityU 電郵").fill(email);
  await page.getByRole("button", { name: "發送驗證碼" }).click();
  await page.getByLabel("6 位數驗證碼").fill(OTP);
  await page.waitForURL((url) => url.pathname === next);
}

async function pngFile() {
  const buffer = await sharp({
    create: { width: 600, height: 800, channels: 3, background: "#a01c34" },
  })
    .png()
    .toBuffer();
  return { name: "menu.png", mimeType: "image/png", buffer };
}

function hkDate(offsetDays: number) {
  return new Date(Date.now() + 8 * 3600_000 + offsetDays * 86400_000)
    .toISOString()
    .slice(0, 10);
}

test.beforeEach(async ({ page }) => {
  // Skip the first-visit tour.
  await page.addInitScript(() => localStorage.setItem("onboarded", "1"));
});

test("home lists restaurants with live status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("而家");
  await expect(page.getByRole("link", { name: /城大食坊/ })).toBeVisible();
  await page.getByPlaceholder("搜尋餐廳、位置、類型").fill("清真");
  await expect(page.getByRole("link", { name: /5380 Cafe/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /城大食坊/ })).toHaveCount(0);
});

test("rejects non-CityU email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("CityU 電郵").fill("someone@gmail.com");
  await page.getByRole("button", { name: "發送驗證碼" }).click();
  await expect(page.getByText("只接受 @cityu.edu.hk")).toBeVisible();
});

test("signed-out write actions redirect to login", async ({ page }) => {
  await page.goto("/r/city-express");
  await page.getByRole("button", { name: "寫食評" }).first().click();
  await page.waitForURL(/\/login\?next=/);
});

test("student reviews, uploads a menu and reports an hours change; admin approves", async ({
  page,
  browser,
}) => {
  await signIn(page, "e2e.student@my.cityu.edu.hk", "/r/city-express");

  // Review
  await page.getByRole("button", { name: "寫食評" }).first().click();
  await page.getByRole("button", { name: /^4 – / }).click();
  await page
    .getByRole("textbox", { name: "食評" })
    .fill("E2E 叉燒飯好食，份量足。");
  await page.getByRole("button", { name: "發佈食評" }).click();
  await expect(page.getByText("E2E 叉燒飯好食，份量足。")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "改食評" }).first(),
  ).toBeVisible();

  // Menu upload
  await page.getByRole("button", { name: "上載餐牌" }).first().click();
  const menuSheet = page.getByRole("dialog", { name: "上載餐牌" });
  await menuSheet.locator('input[type="file"]').setInputFiles(await pngFile());
  await expect(menuSheet.locator('img[src^="/uploads/"]')).toBeVisible();
  await menuSheet.getByRole("button", { name: "上載", exact: true }).click();
  await expect(page.getByText(/由 e2e\.student 上載/)).toBeVisible();
  await page.getByRole("button", { name: "準確" }).click();
  await expect(page.getByRole("button", { name: /準確 1/ })).toBeVisible();

  // Hours change: closed tomorrow
  const tomorrow = hkDate(1);
  await page.getByRole("button", { name: "報告營業時間變動" }).last().click();
  const sheet = page.getByRole("dialog", { name: "報告營業時間變動" });
  await sheet.getByLabel("由").fill(tomorrow);
  await sheet.getByLabel("至").fill(tomorrow);
  await sheet.getByLabel("補充說明").fill("E2E test closure");
  await sheet.getByRole("button", { name: "提交" }).click();
  await expect(page.getByText("已提交，管理員審批後會更新。")).toBeVisible();

  // Non-admins can't see the admin console.
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);

  // Admin approves the submission.
  const adminCtx = await browser.newContext({
    locale: "zh-HK",
    timezoneId: "Asia/Hong_Kong",
  });
  const admin = await adminCtx.newPage();
  await admin.addInitScript(() => localStorage.setItem("onboarded", "1"));
  await signIn(admin, "e2e.admin@cityu.edu.hk", "/admin");
  const card = admin
    .getByRole("listitem")
    .filter({ hasText: "E2E test closure" });
  await card.getByRole("button", { name: "通過" }).click();
  await expect(card).toHaveCount(0);
  await adminCtx.close();

  // The closure now shows on the restaurant's schedule.
  await page.goto("/r/city-express");
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "E2E test closure" });
  await expect(row).toContainText("休息");

  // The student is notified.
  await page.goto("/me");
  await expect(page.getByText("你嘅報料已通過")).toBeVisible();
});

test("roulette picks a restaurant", async ({ page }) => {
  await page.goto("/spin?open=0");
  await expect(page.getByText(/由 \d+ 間餐廳入面揀/)).toBeVisible();
  await page.getByRole("button", { name: "轉！" }).click();
  await expect(page.getByText("今餐食")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "就食呢間" }).click();
  await page.waitForURL(/\/r\//);
});
