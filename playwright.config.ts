import { defineConfig, devices } from "@playwright/test";

const PORT = 3199;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/teardown.ts",
  globalTeardown: "./e2e/teardown.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "zh-HK",
    timezoneId: "Asia/Hong_Kong",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_FIXED_OTP: "246810",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      ADMIN_EMAILS: "e2e.admin@cityu.edu.hk",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
