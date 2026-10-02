# City 食咩好

城大（CityUHK）校園餐廳資訊站：即時營業狀態、餐牌、食評、用戶報料，同埋「轉一轉」輪盤。

## 技術棧

Next.js 16（App Router、Turbopack、React Compiler、Server Actions）· React 19.2 · TypeScript ·
Tailwind CSS v4 · shadcn/ui（Base UI）· Motion · PostgreSQL 18 · Drizzle ORM ·
Better Auth（CityU 電郵 OTP）· Resend · next-intl（繁中／English）· sharp · Biome · Vitest · Playwright

## 本機部署（Docker）

```bash
cp .env.example .env            # 然後填好下面幾項
docker compose --profile app up -d --build
```

網站會喺 <http://localhost:3100>（用 `APP_PORT` 改）。容器啟動時會自動跑 migration 同 seed（seed 唔會覆蓋已改動嘅資料）。

| 變數 | 說明 |
| --- | --- |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` 產生 |
| `BETTER_AUTH_URL` | 用戶實際訪問嘅網址，例如 `https://eat.example.com` |
| `RESEND_API_KEY` | 留空時驗證碼只會印喺伺服器日誌（`docker logs cityeat-app-1`） |
| `EMAIL_FROM` | 寄件人，域名要喺 Resend 驗證咗，例如 `City 食咩好 <noreply@你的域名>` |
| `ADMIN_EMAILS` | 管理員電郵（逗號分隔），登入後即有 `/admin` 權限 |
| `ALLOWED_EMAIL_DOMAINS` | 選填，預設 `cityu.edu.hk,my.cityu.edu.hk` |
| `MENU_SYNC_INTERVAL_MINUTES` | 選填，網上點餐菜單同步間隔，預設 `60` |
| `QMAI_USER_TOKEN` | 選填，企迈（Qmai）點餐平台嘅登入 token。喺 pth5.qmai.cn 登入後，開 DevTools → Network，喺任何 `webapi.qmai.cn` request 嘅 `Qm-User-Token` header 複製。過期咗要重新攞，改完 `docker compose --profile app up -d` |

上載嘅相片存喺 Docker volume `cityeat_uploads`，資料庫喺 `cityeat_pgdata`。

`menu-sync` 容器會定時由網上點餐平台（order.place / Aigens、企迈 Qmai）攞菜單，喺餐廳頁顯示。喺 `/admin/menu-sync` 加點餐連結、即刻同步或者停用；`docker logs cityeat-menu-sync-1` 睇同步紀錄。

## 開發

```bash
pnpm install
docker compose up -d db         # Postgres 喺 127.0.0.1:5434
pnpm db:migrate && pnpm db:seed
pnpm dev                        # http://localhost:3100
pnpm menu:sync --once           # 同步一次網上點餐菜單

pnpm test        # 單元測試（營業時間計算、電郵域名）
pnpm test:e2e    # Playwright 全流程（自己起 3199 port，完咗會清走測試資料）
pnpm lint        # Biome
pnpm typecheck
```

改 schema：編輯 `src/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`。

## 結構

- `src/lib/hours.ts`：營業狀態純函數（每週時段 → 公眾假期 → 特別安排），香港時間
- `src/actions/`：Server Actions（`content.ts` 用戶操作，`admin.ts` 管理操作），全部經 zod 驗證同權限檢查
- `src/lib/queries.ts`：讀取資料
- `src/db/seed-data/restaurants.ts`：種子資料，來自[城大官網餐廳目錄](https://www.cityu.edu.hk/directories/catering)（2026-10-02）；價錢係估算，頁面會標示「未核實」
- `messages/`：繁中（廣東話口語）同英文文案

## 管理

`/admin`：審批報料（營業時間變動通過後即時套用）、處理舉報、編輯餐廳同每週時間、
新增特別安排（例如八號風球「全校休息」）、發佈公告。
