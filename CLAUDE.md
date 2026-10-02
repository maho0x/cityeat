# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

City 食咩好 is a campus dining site for CityUHK: live opening status, menus (photo uploads), reviews, user-submitted corrections moderated in `/admin`, and a roulette wheel. It's Next.js 16 App Router + Postgres/Drizzle + Better Auth. This Next version differs from older training data (e.g. `proxy.ts` replaces `middleware`, `refresh()` from `next/cache`, async `params`). Check `node_modules/next/dist/docs/` before using Next APIs.

## Commands

```bash
docker compose --profile dev up -d db-dev   # dev Postgres on 127.0.0.1:5435
pnpm db:migrate && pnpm db:seed
pnpm dev                         # http://localhost:3100 (port 3000 is taken; 3100 is used by the prod container on this host, so pass -p for another port)

pnpm test                        # Vitest unit tests (src/**/*.test.ts)
pnpm vitest run src/lib/hours.test.ts -t "past midnight"   # single file / test
pnpm test:e2e                    # Playwright; starts its own dev server on :3199
pnpm test:e2e -g "roulette"      # single E2E test
pnpm lint                        # Biome (src/components/ui and drizzle/ are excluded)
pnpm typecheck                   # run `pnpm next typegen` first if PageProps/LayoutProps are missing

pnpm db:generate                 # after editing src/db/schema.ts, then pnpm db:migrate

docker compose --profile app up -d --build   # production stack on :3100 (APP_PORT)
```

`.env`'s `DATABASE_URL` points at `db-dev` (5435) and is what local tooling, seeds and E2E use. The production containers override it with the `db` service, which is also exposed on 127.0.0.1:5434, so anything pointed at 5434 writes to production. Port 3100 is the production app.

The E2E server uses `NEXT_DIST_DIR=.next-e2e` so it can run alongside `pnpm dev`. `e2e/teardown.ts` runs as both global setup and teardown. It deletes `e2e.*` users plus their menus, submissions and upload files, and also deletes overrides with notes starting `E2E`. E2E sign-in uses `E2E_FIXED_OTP`. That only works when `NODE_ENV !== "production"`. Without a `RESEND_API_KEY`, OTP codes are printed to the server log (`docker logs cityeat-app-1` in production).

## Architecture

**Opening status** is the core domain logic. It lives in `src/lib/hours.ts` as a pure function:
- Times are minutes since midnight in Hong Kong time, with a fixed +08:00 offset because HK has no DST.
- A `closes` value above 1440 means the period runs past midnight.
- `weekday` 0–6 is Sun–Sat, and 7 means public holidays. On a holiday, a restaurant with no weekday-7 rows is closed.
- Precedence: a restaurant-specific `hours_override` beats a campus-wide override (`restaurantId = null`), which beats holiday hours, which beat weekly hours.

Status is computed **on the client**. Pages pass the weekly hours, overrides and holiday list, plus `serverNow`. `useNow(serverNow)` then ticks every 30s, which keeps the first render hydration-safe. Unit tests cover this file, so change it test-first.

**Data flow**:
- Reads go through `src/lib/queries.ts` (`server-only`, `cache()`-wrapped) and `src/lib/admin-queries.ts`.
- Writes are Server Actions in `src/actions/content.ts` (users) and `src/actions/admin.ts` (admins).
- Every action is built with `action(zodSchema, fn, { admin? })` from `src/lib/action.ts`. It validates input, requires a session, and returns `ActionResult` (`{ ok, data } | { ok: false, error }`). It never throws to the client.
- Actions call `refresh()` after mutations. Client components show errors with `useActionError()`.
- Approving an `hours_change` submission applies it automatically. A temporary change inserts an override; a permanent change replaces the weekly hours. Other submission types are applied by hand in the restaurant editor.

**Auth** (`src/lib/auth.ts`): Better Auth with the `emailOTP` plugin.
- A `hooks.before` middleware rejects non-CityU domains (`src/lib/email-domain.ts`) and banned users.
- `getViewer()` in `src/lib/session.ts` is the per-request user. Admin means `role = 'admin'` or an email in `ADMIN_EMAILS`.
- Plugin options must leave keys out rather than set them to `undefined`. An explicit `generateOTP: undefined` broke OTP sending in production.
- Writes from signed-out users go through `useRequireSignIn()`, which redirects to `/login?next=…`.

**Uploads**:
- `POST /api/upload` re-encodes each image with sharp to `{id}.webp` plus a 480px `{id}_t.webp` in `UPLOAD_DIR`, and records an `upload` row.
- `/uploads/[file]` serves them. Content stores only the upload ids.
- Actions must call `ownsUploads()` before attaching images.

**Ordering-platform menus** (`src/lib/menu-sync/`):
- `menu_source` rows (one per store; a restaurant can have several counters) are mirrored into `menu_item` by `scripts/menu-sync.ts`, which runs as the `menu-sync` compose service (hourly) or `pnpm menu:sync --once`.
- Aigens stores (`order.place`, `scan.aigens.com` links): the public JSON at `api.aigens.com/api/v1/menu/store/{id}.json` needs no auth or proxy, although Cloudflare blocks the HTML front end from this server. A category's first group holds its dishes; later groups are ordering steps (add-ons, set drinks, boxes) and are skipped.
- Qmai (`qmai.cn`, AC3 Bistro): `store_id` in the link is the merchant account and `multi_id` the shop, stored as `storeId` `{seller}:{shop}`. Without `multi_id` the API returns a different shop under the same account. The menu is `POST webapiga.qmai.cn/web/catering/goods/list/category-item` (HK cluster; `webapi` is mainland) with a logged-in `qm-user-token` from `QMAI_USER_TOKEN`. Login errors (9001/10008) surface as `lastError` asking for a new token. Names are Chinese only. A dish can appear in several categories, so `externalId` is `categoryId:itemId`. The shared `AC3-` category prefix is stripped, and 餐具 categories are skipped.
- `syncSource()` replaces a source's items in one transaction. Failures and empty menus only set `lastError`, so an outage never wipes the mirror.
- Seeded sources live in `src/db/seed-data/restaurants.ts` (`menuSources`).

**i18n**: next-intl without URL prefixes. The locale comes from the `locale` cookie, falling back to Accept-Language; the default is `zh-HK`.
- Message types come from `messages/zh-HK.json` (`src/global.d.ts`), so add every key to both `zh-HK.json` and `en.json`.
- The zh-HK copy is written in colloquial Cantonese (食咩好、開緊、報料).
- Bilingual DB columns use `*Zh`/`*En` pairs, read with `pick(row, "name", locale)`.

**Schema notes** (`src/db/schema.ts`):
- `menu.userId` and `submission.userId` are set to null when the author is deleted, so the content outlives the account.
- Moderation hides content (`hidden = true`) rather than deleting it.
- `src/db/seed.ts` only inserts missing rows and never overwrites admin edits. Its data is in `src/db/seed-data/restaurants.ts` (official CityU catering directory; prices are estimates, so rows are flagged `unverified`).

**UI**:
- `src/app/(site)/` holds every page and shares the header and mobile tab bar.
- Forms open in `Sheet` (`src/components/forms/sheet.tsx`): a bottom drawer on phones, a dialog at md and up.
- Restaurant pages accept `?action=menu|hours|review|fix` to open a sheet directly; the `/contribute` page uses these links.
- The design uses one brand colour (CityU red) plus status colours, defined as tokens in `src/app/globals.css` (`brand`, `open`, `soon`). Don't add other accent colours.
- shadcn components in `src/components/ui` are generated (Base UI, `cn` from the `cn` package). Leave them alone and build app components on top.
- SVG coordinates computed with trig are rounded (see `roulette/wheel.tsx`) to avoid hydration mismatches.

## Deployment

The `Dockerfile` builds Next's standalone output. It also uses esbuild to bundle `scripts/migrate.ts` and `src/db/seed.ts` into plain JS. `docker-entrypoint.sh` runs migrate, then seed, then `server.js`. Uploads persist in the `uploads` volume and Postgres data in `pgdata`. The required `.env` variables are listed in README.md: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS`.
